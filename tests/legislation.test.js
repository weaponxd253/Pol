import assert from 'node:assert/strict';
import test from 'node:test';
import { METERS } from '../js/content.js';
import { advanceTurn, beginPolicyPhase, createInitialState, resolveTurn, selectPolicy, selectResponse } from '../js/engine.js';
import { BILLS, BILL_SCOPES, assessBill, saveBillDraft, submitBill } from '../js/legislation.js';
import { getRoomNpcs } from '../js/npc-content.js';
import { getNpcDialogue } from '../js/npc-dialogue.js';
import { choose } from '../scripts/strategies.mjs';

const infrastructure = 'national-infrastructure-act';
const records = state => state.assembly.legislativeRecords;
const start = () => createInitialState({ mode: 'term', seed: 'ARDEN-1' });

function resolve(state) {
  const { responseId, policyId } = choose(state);
  return resolveTurn(selectPolicy(beginPolicyPhase(selectResponse(state, responseId)), policyId));
}

test('all six bills have three defined scopes with valid meter effects and known backers', () => {
  const state = start();
  assert.equal(BILLS.length, 6);
  assert.equal(new Set(BILLS.map(bill => bill.id)).size, 6);
  assert.deepEqual(BILL_SCOPES.map(scope => scope.id), ['limited', 'standard', 'comprehensive']);
  for (const bill of BILLS) {
    for (const { id } of BILL_SCOPES) {
      const { scope, backers } = assessBill(state, bill.id, id);
      assert.equal(new Set(scope.backers).size, backers.length);
      assert.ok(backers.length > 0);
      for (const effects of [scope.immediate, ...scope.later.map(step => step.effects)]) {
        for (const [meter, amount] of Object.entries(effects)) {
          assert.ok(METERS.some(item => item.id === meter));
          assert.ok(Number.isInteger(amount));
        }
      }
      assert.ok(scope.later.some(step => step.afterTurns >= 2));
    }
  }
  const limited = assessBill(state, infrastructure, 'limited');
  const ambitious = assessBill(state, infrastructure, 'comprehensive');
  assert.equal(limited.likelySeats, 71);
  assert.equal(ambitious.likelySeats, 46);
  assert.equal(ambitious.majoritySeats, 51);
  assert.ok(ambitious.treasuryIfEnacted < limited.treasuryIfEnacted);
  assert.deepEqual(ambitious.scope.later, [
    { afterTurns: 2, effects: { treasury: -3 } }, { afterTurns: 3, effects: { economy: 10 } }
  ]);
});

test('drafts update in place and submission locks one proposal per bill', () => {
  const initial = start();
  assert.throws(() => submitBill(initial, infrastructure), /save a draft/i);
  assert.throws(() => saveBillDraft(initial, 'unknown-bill', 'standard'), /valid legislative bill/i);
  assert.throws(() => saveBillDraft(initial, infrastructure, 'invented-scope'), /valid legislative bill/i);
  assert.throws(() => saveBillDraft(createInitialState(), infrastructure, 'limited'), /active full term/i);
  const drafted = saveBillDraft(initial, infrastructure, 'limited');
  assert.deepEqual(records(initial), []);
  assert.equal(saveBillDraft(drafted, infrastructure, 'limited'), drafted);

  const next = advanceTurn(resolve(drafted));
  const revised = saveBillDraft(next, infrastructure, 'comprehensive');
  const submitted = submitBill(revised, infrastructure);
  assert.deepEqual(records(submitted), [
    { billId: infrastructure, scopeId: 'comprehensive', draftedTurn: 2, submittedTurn: 2 }
  ]);
  assert.equal(records(revised)[0].submittedTurn, null);
  assert.throws(() => submitBill(submitted, infrastructure), /already been submitted/i);
  assert.throws(() => saveBillDraft(submitted, infrastructure, 'standard'), /already been submitted/i);
  assert.throws(() => submitBill({ ...revised, outcome: 'reelected' }, infrastructure), /active full term/i);
});

test('drafting and submission leave forecasts, report effects, and later turns identical', () => {
  const baseline = start();
  const filed = submitBill(saveBillDraft(baseline, infrastructure, 'comprehensive'), infrastructure);
  const withoutLegislation = state => ({
    ...state, assembly: { ...state.assembly, legislativeRecords: [] }
  });
  assert.deepEqual(withoutLegislation(filed), baseline);
  let control = baseline;
  let agenda = filed;
  for (let index = 0; index < 4; index++) {
    const controlReport = resolve(control);
    const agendaReport = resolve(agenda);
    assert.deepEqual(withoutLegislation(agendaReport), controlReport);
    control = advanceTurn(controlReport);
    agenda = advanceTurn(agendaReport);
    assert.deepEqual(withoutLegislation(agenda), control);
  }
  assert.deepEqual(records(agenda), records(filed));
});

test('Finance reviews saved drafts and the Chief assesses filed proposals', () => {
  const [finance] = getRoomNpcs('CabinetRoomScene');
  const [chief] = getRoomNpcs('GovernmentCorridorScene');
  const drafted = saveBillDraft(start(), infrastructure, 'comprehensive');
  const financeTopic = 'legislative-finance';
  const chiefTopic = 'legislative-support';
  assert.ok(getNpcDialogue(finance, createInitialState()).topics.every(topic => topic.id !== financeTopic));
  const forecast = getNpcDialogue(finance, drafted, financeTopic).entries[0];
  assert.match(forecast.title, /National Infrastructure Act · Comprehensive/);
  assert.match(forecast.text, /Treasury -16 at enactment/);
  assert.match(forecast.text, /Treasury -3 2 turns after enactment/);
  assert.deepEqual(getNpcDialogue(chief, drafted, chiefTopic).entries, []);

  const submitted = submitBill(drafted, infrastructure);
  assert.deepEqual(getNpcDialogue(finance, submitted, financeTopic).entries, []);
  const reading = getNpcDialogue(chief, submitted, chiefTopic).entries[0];
  assert.match(reading.text, /46 likely seats, with 51 needed/);
  assert.match(reading.text, /Arden National Union/);
  assert.match(reading.text, /5 more seats/);
});
