import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTurn, beginPolicyPhase, createInitialState, resolveTurn, selectPolicy, selectResponse } from '../js/engine.js';
import { BILLS, saveBillDraft, submitBill } from '../js/legislation.js';
import { BILL_AMENDMENTS, NEGOTIATORS } from '../js/negotiation-content.js';
import { assessNegotiation, assessProposal, changeAmendment, negotiationRelationship } from '../js/negotiations.js';
import { negotiationDialogueMarkup } from '../js/negotiation-dialogue.js';
import { loadGame, SAVE_KEY, saveGame } from '../js/storage.js';
import { choose } from '../scripts/strategies.mjs';

const union = 'arden-national-union';
const reform = 'civic-reform-alliance';
const regional = 'regional-independence-coalition';
const infrastructure = 'national-infrastructure-act';
const healthcare = 'public-healthcare-reform-act';
const education = 'national-education-investment-act';
const tax = 'economic-development-and-tax-reform-act';
const security = 'national-security-modernization-act';
const start = () => createInitialState({ mode: 'term', seed: 'ARDEN-1' });
const file = (state, bill, scope = 'comprehensive') => submitBill(saveBillDraft(state, bill, scope), bill);
const amend = (state, bill, party, kind = 'adopt') => changeAmendment(state, bill, BILL_AMENDMENTS[bill][party].id, kind);

function report(state) {
  const { responseId, policyId } = choose(state);
  return resolveTurn(selectPolicy(beginPolicyPhase(selectResponse(state, responseId)), policyId));
}

test('every filed bill has three substantive provisions, one per negotiator', () => {
  for (const { id } of BILLS) {
    assert.deepEqual(Object.keys(BILL_AMENDMENTS[id]).sort(), Object.keys(NEGOTIATORS).sort());
    const state = file(start(), id);
    for (const partyId of Object.keys(NEGOTIATORS)) {
      const offer = assessNegotiation(state, id, partyId);
      assert.ok(offer.amendment.request.length);
      for (const id of Object.keys(offer.amendment.support)) {
        assert.ok(state.assembly.parties.some(party => party.id === id));
      }
      if (offer.preview) {
        assert.notDeepEqual(offer.preview.scope, offer.current.scope);
        assert.ok(offer.preview.partySupport.every(bloc => bloc.likelySeats >= 0 && bloc.likelySeats <= bloc.party.seats));
      }
    }
  }
});

test('rural infrastructure changes the filed forecast while preserving simulation outcomes', () => {
  const filed = file(start(), infrastructure);
  const whip = negotiationDialogueMarkup(filed, union, infrastructure, 'position');
  assert.match(whip, /39 likely backers from our 46 seats, with 7 possible defections/);
  assert.match(whip, /Talia Vale in the Government Corridor/);
  const offer = assessNegotiation(filed, infrastructure, regional);
  assert.equal(offer.current.likelySeats, 39);
  assert.equal(offer.preview.likelySeats, 52);
  assert.equal(offer.preview.majoritySeats, 51);
  assert.equal(offer.preview.scope.immediate.treasury, -21);
  assert.equal(offer.preview.scope.later.find(step => step.afterTurns === 3).effects.economy, 12);
  assert.equal(offer.preview.partySupport.find(bloc => bloc.party.id === regional).likelySeats, 14);
  const amended = amend(filed, infrastructure, regional);
  assert.deepEqual(assessProposal(amended, infrastructure), offer.preview);
  assert.deepEqual(filed.assembly.negotiationHistory, []);
  assert.deepEqual(report(amended).history, report(filed).history);
  assert.deepEqual(report(amended).scheduledEffects, report(filed).scheduledEffects);
});

test('delay moves both costs and gains, and a sunset drops out-year effects', () => {
  let state = file(start(), infrastructure);
  state = amend(amend(state, infrastructure, regional), infrastructure, union);
  const delayed = assessProposal(state, infrastructure).scope;
  assert.deepEqual(delayed.immediate, {});
  assert.deepEqual(delayed.later, [
    { afterTurns: 1, effects: { treasury: -21, approval: 4, donors: -2 } },
    { afterTurns: 3, effects: { treasury: -3 } },
    { afterTurns: 4, effects: { economy: 12 } }
  ]);

  state = file(state, healthcare, 'standard');
  state = amend(amend(state, healthcare, reform), healthcare, union);
  const sunset = assessProposal(state, healthcare).scope;
  assert.deepEqual(sunset.immediate, { treasury: -6, approval: 1 });
  assert.deepEqual(sunset.later, []);
});

test('two active provisions, closed offers and filing requirements constrain amendments', () => {
  const initial = start();
  const drafted = saveBillDraft(initial, infrastructure, 'standard');
  assert.throws(() => amend(drafted, infrastructure, regional), /file this bill/i);
  let state = submitBill(drafted, infrastructure);
  assert.throws(() => amend(state, infrastructure, regional, 'withdraw'), /is not in the bill/i);
  state = amend(state, infrastructure, regional);
  assert.throws(() => amend(state, infrastructure, regional), /already in the bill/i);
  state = amend(state, infrastructure, reform);
  assert.throws(() => amend(state, infrastructure, union), /two major amendments/i);
  state = amend(state, infrastructure, regional, 'withdraw');
  assert.throws(() => amend(state, infrastructure, regional), /already withdrawn/i);
  state = amend(state, infrastructure, union);
  assert.equal(assessProposal(state, infrastructure).amendments.length, 2);
  assert.throws(() => amend({ ...state, outcome: 'reelected' }, infrastructure, reform, 'withdraw'), /active full term/i);
});

test('trust comes from keeping or breaking commitments and affects offers without buying votes', () => {
  let state = file(file(file(start(), infrastructure), education), tax);
  assert.equal(negotiationRelationship(state, regional).label, 'Professional');
  assert.match(assessNegotiation(state, tax, regional).reason, /kept commitments/i);
  const originalTax = assessProposal(state, tax).likelySeats;
  state = amend(amend(state, infrastructure, regional), education, regional);
  assert.equal(negotiationRelationship(state, regional).trust, 0);
  state = advanceTurn(report(state));
  assert.equal(negotiationRelationship(state, regional).label, 'Cooperative');
  assert.equal(assessNegotiation(state, tax, regional).reason, '');
  assert.equal(assessProposal(state, tax).likelySeats, originalTax);
  state = amend(state, infrastructure, regional, 'withdraw');
  assert.equal(negotiationRelationship(state, regional).label, 'Professional');
  assert.match(assessNegotiation(state, tax, regional).reason, /kept commitments/i);

  let hostile = file(file(file(file(start(), infrastructure), education), healthcare), security, 'limited');
  const securityBackers = assessProposal(hostile, security).partySupport.find(bloc => bloc.party.id === reform).likelySeats;
  for (const bill of [infrastructure, education]) {
    hostile = amend(amend(hostile, bill, reform), bill, reform, 'withdraw');
  }
  assert.equal(negotiationRelationship(hostile, reform).label, 'Hostile');
  assert.match(assessNegotiation(hostile, healthcare, reform).reason, /kept commitments/i);
  assert.equal(assessNegotiation(hostile, security, reform).reason, '');
  assert.ok(securityBackers > 0);
  assert.equal(assessProposal(hostile, security).partySupport.find(bloc => bloc.party.id === reform).likelySeats, securityBackers);
});

test('save replay restores agreements and rejects impossible or duplicate commitments', () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  let state = file(start(), infrastructure);
  saveGame(state, storage);
  const prior = JSON.parse(data.get(SAVE_KEY));
  prior.saveVersion = 3;
  delete prior.state.assembly.negotiationHistory;
  data.set(SAVE_KEY, JSON.stringify(prior));
  assert.deepEqual(loadGame(storage).state, state);

  state = amend(state, infrastructure, regional);
  state = advanceTurn(report(state));
  state = amend(state, infrastructure, regional, 'withdraw');
  state = amend(state, infrastructure, reform);
  saveGame(state, storage);
  const intact = data.get(SAVE_KEY);
  assert.deepEqual(loadGame(storage).state, state);
  assert.equal(negotiationRelationship(loadGame(storage).state, regional).label, 'Skeptical');
  for (const edit of [
    log => log.splice(1, 0, log[0]),
    log => { log[0].turn = 0; },
    log => { log[0].kind = 'withdraw'; },
    log => { log[0].amendmentId = 'unknown'; },
    log => { log[0].support = 100; }
  ]) {
    const altered = JSON.parse(intact);
    edit(altered.state.assembly.negotiationHistory);
    data.set(SAVE_KEY, JSON.stringify(altered));
    assert.equal(loadGame(storage).replacementRequired, true);
  }
});
