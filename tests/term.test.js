import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, getPolicies, getEvent, policyDetails, selectResponse, beginPolicyPhase, selectPolicy, calculateTurn, resolveTurn, advanceTurn, evaluateOutcome, forecastBudget } from '../js/engine.js';
import { choose, play } from '../scripts/strategies.mjs';

const prepare = (state, response, policy) => selectPolicy(beginPolicyPhase(selectResponse(state, response)), policy);

test('20 opening seeds guarantee distinct financial and support choices with correct deck accounting', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const state = createInitialState({ mode: 'term', seed: 'ARDEN-' + seed });
    const hand = getPolicies(state).filter(policy => state.hand.includes(policy.id));
    assert.equal(state.hand.length, 4);
    assert.equal(state.policyDeck.length, 12);
    assert.equal(new Set([...state.hand, ...state.policyDeck]).size, 16);
    assert.equal(new Set([state.currentEvent.id, ...state.eventDeck]).size, 12);
    const funding = hand.find(policy => policy.effects.treasury > 0);
    assert.ok(funding);
    assert.ok(hand.some(policy => policy.id !== funding.id && (policy.effects.approval > 0 || policy.effects.stability > 0)));
    assert.deepEqual(createInitialState({ mode: 'term', seed: state.seed }), state);
  }
});

test('previews are pure and only a committed turn draws one replacement', () => {
  const initial = createInitialState({ mode: 'term' });
  const choice = choose(initial);
  const pending = prepare(initial, choice.responseId, choice.policyId);
  const before = structuredClone(pending);
  const preview = calculateTurn(pending);
  calculateTurn(pending);
  assert.deepEqual(pending, before);
  const report = resolveTurn(pending);
  assert.deepEqual(report.history[0], preview);
  assert.equal(report.hand.length, 4);
  assert.equal(report.policyDeck.length, 11);
  assert.equal(report.rngState, initial.rngState);
  assert.deepEqual(report.eventDeck, initial.eventDeck);
  assert.throws(() => resolveTurn(report));
  const notInHand = getPolicies(initial).find(policy => !initial.hand.includes(policy.id));
  assert.throws(() => selectPolicy(pending, notInHand.id));
});

test('debt repayment charges only actual debt and lowers interest immediately', () => {
  const initial = createInitialState({ mode: 'term' });
  initial.hand = ['repayment', 'cuts', 'aid', 'services'];
  assert.equal(policyDetails(initial, getPolicies(initial).find(policy => policy.id === 'repayment')).disabledReason, 'Requires outstanding debt');
  initial.debt = 6;
  const result = calculateTurn(prepare(initial, getEvent(initial).responses[0].id, 'repayment'));
  assert.equal(result.debt, 0);
  assert.equal(result.newDebt, -6);
  assert.equal(result.budget.interest, 0);
  assert.equal(result.contributions.treasury.find(effect => effect.type === 'policy').amount, -6);
  initial.debt = 18;
  assert.match(policyDetails(initial, getPolicies(initial).find(policy => policy.id === 'repayment')).consequence, /Interest this turn: 1 \(was 1\)/);
});

test('term services create three dated payments and delayed investment improves next-turn revenue', () => {
  const initial = createInitialState({ mode: 'term' });
  initial.hand = ['services', 'training', 'cuts', 'aid'];
  const services = calculateTurn(prepare(initial, getEvent(initial).responses[0].id, 'services'));
  assert.deepEqual(services.newScheduled.map(effect => effect.dueTurn), [2, 3, 4]);
  const training = advanceTurn(resolveTurn(prepare(initial, getEvent(initial).responses[0].id, 'training')));
  const choice = choose(training);
  const projected = calculateTurn(prepare(training, choice.responseId, choice.policyId));
  assert.equal(projected.due[0].amount, 6);
  assert.equal(projected.budget.revenue, 8 + Math.floor(projected.meters.economy / 10));
});

test('high-debt and low-stability conditions freeze when an event is revealed', () => {
  let initial = createInitialState({ mode: 'term' });
  let choice = choose(initial);
  let report = resolveTurn(prepare(initial, choice.responseId, choice.policyId));
  report.debt = 30;
  report.eventDeck = ['review'];
  let next = advanceTurn(report);
  assert.equal(getEvent(next).responses[1].effects.treasury, -5);
  next.debt = 0;
  assert.equal(getEvent(next).responses[1].effects.treasury, -5);
  report.meters.stability = 29;
  report.eventDeck = ['workers'];
  next = advanceTurn(report);
  assert.equal(getEvent(next).responses[0].effects.treasury, -11);
  assert.match(getEvent(next).responses[0].condition, /Applies/);
  report.meters.stability = 30;
  assert.equal(getEvent(advanceTurn(report)).responses[0].effects.treasury, -8);
});

test('the election is checked at 49 and 50 and collapse has priority', () => {
  const meters = createInitialState({ mode: 'term' }).meters;
  assert.equal(evaluateOutcome({ ...meters, approval: 49 }, 'term', 11), null);
  assert.equal(evaluateOutcome({ ...meters, approval: 49 }, 'term', 12), 'election-lost');
  assert.equal(evaluateOutcome({ ...meters, approval: 50 }, 'term', 12), 'reelected');
  assert.equal(evaluateOutcome({ ...meters, approval: 90, treasury: 0 }, 'term', 12), 'collapsed');
});

test('a final-turn promise remains after the election without a replacement draw', () => {
  const initial = createInitialState({ mode: 'term' });
  initial.turn = 12;
  initial.hand = ['wages', 'cuts', 'aid', 'services'];
  const report = resolveTurn(prepare(initial, getEvent(initial).responses[0].id, 'wages'));
  assert.deepEqual(report.scheduledEffects.map(effect => effect.dueTurn), [13, 14, 15]);
  assert.equal(report.policyDeck.length, initial.policyDeck.length);
  assert.equal(report.hand.length, 3);
  assert.equal(forecastBudget(report).budget.commitments, 3);
  assert.equal(advanceTurn(report).phase, 'result');
});

test('complete seeded runs are deterministic and all three term outcomes are reachable', () => {
  const outcomes = new Set();
  for (let index = 1; index <= 20; index++) {
    for (const strategy of ['adaptive', 'fiscal', 'reckless']) {
      const result = play('ARDEN-' + index, strategy);
      outcomes.add(result.outcome);
      assert.equal(result.phase, 'result');
      assert.equal(new Set(result.usedPolicyIds).size, result.history.length);
      assert.equal(result.hand.length + result.policyDeck.length + result.usedPolicyIds.length, 16);
      if (result.outcome !== 'collapsed') assert.equal(result.turn, 12);
    }
  }
  assert.deepEqual(outcomes, new Set(['reelected', 'election-lost', 'collapsed']));
  assert.deepEqual(play('ARDEN-1'), play('ARDEN-1'));
});
