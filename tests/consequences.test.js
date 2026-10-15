import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, METERS, validateContent } from '../js/content.js';
import { createInitialState, getEvent, getPolicies, policyDetails, selectResponse, beginPolicyPhase, selectPolicy, calculateTurn, resolveTurn, advanceTurn, capConditionModifiers } from '../js/engine.js';
import { candidates, choose } from '../scripts/strategies.mjs';
import { loadGame, saveGame, SAVE_KEY } from '../js/storage.js';
import { renderGame } from '../js/view.js';

const prepare = (state, policyId, responseId = getEvent(state).responses[0].id) => selectPolicy(beginPolicyPhase(selectResponse(state, responseId)), policyId);
// Small engine fixtures control timing and event order; save checks below use legal seeded runs.
function enact(policyId, turn = 3) {
  const state = createInitialState({ mode: 'term', seed: 'CONSEQUENCES' });
  state.turn = turn;
  state.hand = [policyId, ...getPolicies(state).filter(policy => policy.id !== policyId).slice(0, 3).map(policy => policy.id)];
  return resolveTurn(prepare(state, policyId));
}
function reveal(report, eventId, turn = report.turn + 1) {
  const fixture = structuredClone(report);
  fixture.turn = turn - 1;
  fixture.eventDeck = [eventId, ...fixture.eventDeck.filter(id => id !== eventId)];
  return advanceTurn(fixture);
}
function normalTurn(state, responseId = null) {
  const choice = responseId ? candidates(state).find(item => item.responseId === responseId && item.policyId !== 'services' && !item.projection.failures.length) : choose(state, 'adaptive', ['services']);
  return resolveTurn(prepare(state, choice.policyId, choice.responseId));
}
function checkContributions(report) {
  for (const meter of METERS) assert.equal(report.startMeters[meter.id] + report.contributions[meter.id].reduce((sum, item) => sum + item.amount, 0), report.rawMeters[meter.id], meter.id);
}

test('each nation condition has its exact next-turn start, duration, and final-turn behavior', () => {
  for (const [policy, duration, eventId, response, meter, amount] of [
    ['cuts', 3, 'workers', 0, 'treasury', -10],
    ['responders', 4, 'flood', 0, 'treasury', -5],
    ['reform', 4, 'scandal', 0, 'treasury', -2],
    ['trade', 4, 'dispute', 0, 'treasury', -2],
  ]) {
    const report = enact(policy);
    const condition = report.nationConditions[0];
    assert.equal(condition.startTurn, 4);
    assert.equal(condition.lastTurn, 3 + duration);
    assert.equal(getEvent(reveal(report, eventId, 4)).responses[response].effects[meter], amount);
    const last = reveal(report, eventId, 3 + duration);
    assert.equal(getEvent(last).responses[response].effects[meter], amount);
    const lastReport = normalTurn(last);
    assert.equal(lastReport.history.at(-1).expiringConditions[0].id, condition.id);
    const expired = reveal(report, eventId, 4 + duration);
    assert.equal(expired.nationConditions.length, 0);
    assert.equal(getEvent(expired).responses[response].effectBreakdown.some(item => item.type === 'nation'), false);
  }
});

test('protection affects only its named choices, and unrelated events remain unchanged', () => {
  const reform = enact('reform');
  const scandal = getEvent(reveal(reform, 'scandal'));
  assert.equal(scandal.responses[0].effects.approval, 7);
  assert.equal(scandal.responses[1].effects.approval, -8);
  assert.equal(scandal.responses[1].effectBreakdown.some(item => item.type === 'nation'), false);
  const dispute = getEvent(reveal(enact('trade'), 'dispute'));
  assert.equal(dispute.responses[1].effects.international, -12);
  const workers = getEvent(reveal(enact('cuts'), 'workers'));
  assert.equal(workers.responses[1].effects.stability, -10);
  const flood = getEvent(reveal(enact('responders'), 'flood'));
  assert.equal(flood.responses[1].effects.stability, -5);
  const unrelated = getEvent(reveal(enact('responders'), 'surplus'));
  assert.equal(unrelated.responses.every(response => response.effectBreakdown.every(item => item.type !== 'nation')), true);
});

test('opposing conditions and low Stability retain separate exact causes with no double counting', () => {
  const strained = enact('cuts');
  strained.nationConditions.push(...enact('responders').nationConditions);
  strained.meters.stability = 29;
  const state = reveal(strained, 'flood');
  const response = getEvent(state).responses[0];
  assert.equal(response.effects.treasury, -10); // -8 base -3 threshold -2 strain +3 preparation
  assert.deepEqual(response.effectBreakdown.filter(item => item.meter === 'treasury').map(item => item.amount), [-8, -3, -2, 3]);
  assert.match(response.condition, /enacted on turn 3/);
  const choice = choose(state);
  const pending = prepare(state, choice.policyId, response.id);
  const before = structuredClone(pending);
  const preview = calculateTurn(pending);
  calculateTurn(pending);
  assert.deepEqual(pending, before);
  const settled = resolveTurn(pending);
  assert.deepEqual(settled.history.at(-1), preview);
  assert.equal(preview.conditionApplications.length, 2);
  checkContributions(preview);
  // A later policy cannot change the frozen costs or current national snapshot.
  settled.meters.stability = 90;
  settled.nationConditions = [];
  assert.deepEqual(getEvent(settled), getEvent(state));
});

test('condition cap combines opposing sources first and records its correction', () => {
  const rows = [{ meter: 'treasury', amount: 9, type: 'nation' }, { meter: 'treasury', amount: -2, type: 'nation' }, { meter: 'stability', amount: -7, type: 'nation' }];
  const before = structuredClone(rows);
  const capped = capConditionModifiers(rows);
  assert.deepEqual(rows, before);
  assert.equal(capped.filter(item => item.meter === 'treasury').reduce((sum, item) => sum + item.amount, 0), 4);
  assert.equal(capped.filter(item => item.meter === 'stability').reduce((sum, item) => sum + item.amount, 0), -4);
  assert.deepEqual(capped.filter(item => item.type === 'condition-cap').map(item => item.amount), [-3, 3]);
});

test('new preparedness cannot change an already revealed flood', () => {
  const state = reveal(enact('aid'), 'flood');
  state.hand = ['responders', 'cuts', 'bonds', 'taxes'];
  const event = getEvent(state);
  const pending = prepare(state, 'responders');
  const preview = calculateTurn(pending);
  assert.deepEqual(getEvent(pending), event);
  assert.equal(preview.conditionApplications.length, 0);
  assert.equal(preview.newConditions[0].startTurn, state.turn + 1);
  const report = resolveTurn(pending);
  assert.deepEqual(getEvent(report), event);
  assert.throws(() => resolveTurn(report));
});

test('colliding reviews reserve stable slots, preserve base events, and charge renewal payments once', () => {
  let state = advanceTurn(enact('wages', 2));
  state.hand = ['infrastructure', 'aid', 'bonds', 'cuts'];
  const pending = prepare(state, 'infrastructure');
  const before = structuredClone(pending);
  const preview = calculateTurn(pending);
  assert.equal(preview.newReviews[0].requestedTurn, 6);
  assert.equal(preview.newReviews[0].reservedTurn, 7);
  assert.match(policyDetails(state, getPolicies(state).find(item => item.id === 'infrastructure')).consequence, /turn 7/);
  assert.deepEqual(pending, before);
  let report = resolveTurn(pending);
  while (report.turn < 5) report = normalTurn(advanceTurn(report));
  const baseDeck = [...report.eventDeck];
  state = advanceTurn(report);
  assert.equal(state.turn, 6);
  assert.equal(getEvent(state).id, 'wage-review');
  assert.equal(getEvent(state).reviewSource.sourceTurn, 2);
  assert.deepEqual(state.eventDeck, baseDeck);
  report = normalTurn(state, 'extend');
  const renewal = report.history.at(-1);
  assert.equal(renewal.budget.commitments, 0);
  assert.deepEqual(renewal.newScheduled.filter(item => item.sourceType === 'response').map(item => [item.dueTurn, item.amount]), [[7, -3], [8, -3]]);
  assert.equal(new Set(report.scheduledEffects.map(item => item.id)).size, report.scheduledEffects.length);
  checkContributions(renewal);
  state = advanceTurn(report);
  assert.equal(getEvent(state).id, 'infrastructure-review');
  assert.deepEqual(state.eventDeck, baseDeck);
  assert.equal(state.reviewReservations.length, 0);
  report = normalTurn(state, 'maintain');
  assert.equal(report.history.at(-1).budget.commitments, 3);
  assert.equal(report.history.flatMap(item => item.due).filter(item => item.sourceId === 'infrastructure').length, 1);
  assert.equal(report.history.at(-1).newReviews.length, 0);
  state = advanceTurn(report);
  assert.equal(getEvent(state).id, baseDeck[0]);
  assert.equal(state.eventDeck.length, baseDeck.length - 1);
  report = normalTurn(state);
  assert.equal(report.history.at(-1).budget.commitments, 3);
  assert.equal(report.scheduledEffects.filter(item => item.sourceType === 'response').length, 0);
  assert.equal(normalTurn(advanceTurn(report)).history.at(-1).budget.commitments, 0);
});

test('a reserved slot can defer a review without extending original wage payments', () => {
  const state = createInitialState({ mode: 'term' });
  state.turn = 2;
  state.hand = ['wages', 'aid', 'cuts', 'bonds'];
  state.reviewReservations = [{ id: 'reserved-slot', reviewId: 'infrastructure-review', title: 'Infrastructure maintenance review', sourceId: 'infrastructure', source: 'Infrastructure investment', sourceTurn: 1, requestedTurn: 6, reservedTurn: 6 }];
  const pending = prepare(state, 'wages');
  const report = calculateTurn(pending);
  assert.equal(report.newReviews[0].reservedTurn, 7);
  assert.deepEqual(report.newScheduled.map(item => item.dueTurn), [3, 4, 5]);
  assert.deepEqual(state.reviewReservations.map(item => item.reservedTurn), [6]);
});

test('last-turn conditions and reviews are disclosed without extending the term or assuming responses', () => {
  const wages = enact('wages', 12);
  const result = advanceTurn(wages);
  assert.equal(result.phase, 'result');
  assert.equal(result.turn, 12);
  assert.equal(result.reviewReservations[0].reservedTurn, 16);
  assert.deepEqual(result.scheduledEffects.map(item => item.dueTurn), [13, 14, 15]);
  assert.equal(result.history.length, 1);
  assert.equal(result.scheduledEffects.some(item => item.sourceType === 'response'), false);
  const screen = renderGame(result);
  assert.match(screen, /What your government leaves behind/);
  assert.match(screen, /TURN 16/);
  assert.match(screen, /no response or payment assumed/);
  const prepared = advanceTurn(enact('responders', 12));
  assert.equal(prepared.nationConditions[0].lastTurn, 16);
  assert.match(renderGame(prepared), /Turns 13–16/);
});

test('condition and review previews are visibly proposed, source-linked, and separate from bills', () => {
  const state = createInitialState({ mode: 'term' });
  state.hand = ['responders', 'wages', 'cuts', 'infrastructure'];
  const prepared = prepare(state, 'responders');
  const screen = renderGame(prepared);
  assert.match(screen, /PREVIEW · NOT ENACTED/);
  assert.match(screen, /Turns 2–5/);
  assert.match(screen, /Proposed on turn 1/);
  assert.deepEqual(state.nationConditions, []);
  assert.match(renderGame(prepare(state, 'wages')), /TURN 5/);
  const futureEvent = reveal(enact('responders'), 'flood');
  assert.match(renderGame(futureEvent), /enacted on turn 3/);
});

test('a review on turn twelve still settles a policy and checks collapse before the election', () => {
  const preceding = enact('wages', 8);
  preceding.turn = 11;
  const state = advanceTurn(preceding);
  assert.equal(getEvent(state).id, 'wage-review');
  state.hand = ['bonds', 'aid', 'cuts', 'regulations'];
  state.meters.treasury = 90;
  const beforeDeck = [...state.policyDeck];
  state.meters.approval = 46;
  const winning = resolveTurn(prepare(state, 'bonds', 'extend'));
  assert.equal(winning.meters.approval, 50);
  assert.equal(winning.outcome, 'reelected');
  assert.deepEqual(winning.policyDeck, beforeDeck);
  assert.deepEqual(winning.history.at(-1).newScheduled.map(item => item.dueTurn), [13, 14]);
  state.meters.approval = 45;
  assert.equal(resolveTurn(prepare(state, 'bonds', 'extend')).outcome, 'election-lost');
  state.meters.approval = 90;
  state.meters.stability = 1;
  assert.equal(resolveTurn(prepare(state, 'bonds', 'end')).outcome, 'collapsed');
});

test('conditions ending on the final turn appear in history rather than as remaining protection', () => {
  const state = enact('responders', 8);
  state.turn = 12;
  state.phase = 'result';
  state.outcome = 'reelected';
  const screen = renderGame(state);
  assert.doesNotMatch(screen, /data-condition="emergency-preparedness"/);
  assert.match(screen, /Emergency preparedness created/);
  assert.match(screen, /No lasting conditions remain beyond this turn/);
});

test('seeded runs restore conditions, review choices, and frozen effects in every phase', () => {
  let raw = null;
  const store = { getItem: () => raw, setItem: (_key, value) => { raw = value; } };
  const seenConditions = new Set();
  const seenReviews = new Set();
  function check(state) {
    assert.equal(saveGame(state, store).ok, true);
    assert.deepEqual(loadGame(store).state, state);
  }
  for (let seed = 1; seed <= 6; seed++) {
    let state = createInitialState({ mode: 'term', seed: 'ARDEN-' + seed });
    while (!state.outcome) {
      check(state);
      if (getEvent(state).origin === 'review') seenReviews.add(getEvent(state).id);
      const legal = candidates(state).filter(item => !item.projection.failures.length);
      const priority = ['wages', 'infrastructure', 'responders', 'reform', 'trade', 'cuts'];
      const choice = legal.sort((a, b) => (priority.indexOf(a.policyId) < 0 ? 99 : priority.indexOf(a.policyId)) - (priority.indexOf(b.policyId) < 0 ? 99 : priority.indexOf(b.policyId)))[0] || choose(state);
      state = selectResponse(state, choice.responseId); check(state);
      state = beginPolicyPhase(state); check(state);
      state = selectPolicy(state, choice.policyId); check(state);
      state = resolveTurn(state); check(state);
      state.history.at(-1).newConditions.forEach(item => seenConditions.add(item.conditionId));
      state = advanceTurn(state); check(state);
    }
    const valid = JSON.parse(raw);
    const altered = structuredClone(valid);
    altered.state.history.find(item => item.newReviews.length).newReviews[0].reservedTurn++;
    raw = JSON.stringify(altered);
    assert.equal(loadGame(store).state, null);
    assert.equal(loadGame(store).replacementRequired, true);
    raw = JSON.stringify(valid);
    const withCondition = valid.state.history.find(item => item.newConditions.length);
    if (withCondition) {
      withCondition.newConditions[0].lastTurn++;
      raw = JSON.stringify(valid);
      assert.equal(loadGame(store).state, null);
    }
  }
  assert.deepEqual([...seenReviews].sort(), ['infrastructure-review', 'wage-review']);
  assert.equal(seenConditions.size, 4);
});

test('invalid nation targets and durations are rejected, while quick policies remain unchanged', () => {
  const broken = structuredClone(SCENARIOS);
  broken.term.nationConditions[0].duration = 0;
  assert.throws(() => validateContent(broken));
  broken.term.nationConditions[0].duration = 3;
  broken.term.nationConditions[0].modifiers[0].responseId = 'missing';
  assert.throws(() => validateContent(broken));
  assert.equal(SCENARIOS.quick.policies.every(item => !item.nationConditionId && !item.review), true);
  const store = { value: 'older saved run', getItem() { return this.value; }, setItem(_key, value) { this.value = value; } };
  const loaded = loadGame(store);
  assert.equal(loaded.hasStoredGame, true);
  assert.equal(loaded.replacementRequired, true);
  assert.equal(saveGame(createInitialState(), store).ok, true);
  assert.equal(store.getItem(SAVE_KEY), 'older saved run');
});
