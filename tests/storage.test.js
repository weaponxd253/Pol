import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, selectResponse, beginPolicyPhase, selectPolicy, resolveTurn, advanceTurn } from '../js/engine.js';
import { SAVE_KEY, SAVE_VERSION, loadGame, saveGame } from '../js/storage.js';
import { choose, play } from '../scripts/strategies.mjs';
import { BILLS, saveBillDraft, submitBill } from '../js/legislation.js';

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}

test('every phase and selection restores the exact hand, event terms, commitments, and random state', () => {
  const store = memoryStorage();
  let state = createInitialState({ mode: 'term', seed: 'ARDEN-1' });
  const snapshots = [state];
  const choice = choose(state);
  state = selectResponse(state, choice.responseId); snapshots.push(state);
  state = beginPolicyPhase(state); snapshots.push(state);
  state = selectPolicy(state, choice.policyId); snapshots.push(state);
  state = resolveTurn(state); snapshots.push(state);
  state = advanceTurn(state); snapshots.push(state);
  const completed = play('ARDEN-1');
  snapshots.push({ ...completed, phase: 'report' }, completed);
  for (const snapshot of snapshots) {
    assert.deepEqual(snapshot.assembly, snapshots[0].assembly);
    assert.equal(saveGame(snapshot, store).ok, true);
    assert.deepEqual(loadGame(store).state, snapshot);
  }
});

test('pre-Assembly saves restore the original term and upgrade on the next save', () => {
  const store = memoryStorage();
  const state = play('ARDEN-1');
  saveGame(state, store);
  const oldSave = JSON.parse(store.getItem(SAVE_KEY));
  delete oldSave.state.assembly;
  oldSave.saveVersion = 1;
  const original = JSON.stringify(oldSave);
  store.setItem(SAVE_KEY, original);

  const migrated = loadGame(store).state;
  assert.deepEqual(migrated, state);
  assert.equal(store.getItem(SAVE_KEY), original);
  saveGame(migrated, store);
  assert.equal(JSON.parse(store.getItem(SAVE_KEY)).saveVersion, SAVE_VERSION);
  assert.deepEqual(loadGame(store).state, state);
});

test('Assembly foundation saves resume with an empty agenda', () => {
  const store = memoryStorage();
  const state = play('ARDEN-1');
  saveGame(state, store);
  const saved = JSON.parse(store.getItem(SAVE_KEY));
  saved.saveVersion = 2;
  delete saved.state.assembly.negotiationHistory;
  store.setItem(SAVE_KEY, JSON.stringify(saved));
  assert.deepEqual(loadGame(store).state, state);
});

test('saved proposals and editable drafts survive turn replay, including historical filing dates', () => {
  const store = memoryStorage();
  const [first, second] = BILLS;
  let state = createInitialState({ mode: 'term', seed: 'ARDEN-1' });
  state = saveBillDraft(state, first.id, 'comprehensive');
  const { responseId, policyId } = choose(state);
  state = advanceTurn(resolveTurn(selectPolicy(beginPolicyPhase(selectResponse(state, responseId)), policyId)));
  state = submitBill(state, first.id);
  state = saveBillDraft(state, second.id, 'limited');
  saveGame(state, store);
  assert.deepEqual(loadGame(store).state, state);
  assert.deepEqual(loadGame(store).state.assembly.legislativeRecords, [
    { billId: first.id, scopeId: 'comprehensive', draftedTurn: 1, submittedTurn: 2 },
    { billId: second.id, scopeId: 'limited', draftedTurn: 2, submittedTurn: null }
  ]);

  const original = store.getItem(SAVE_KEY);
  for (const edit of [
    records => records.push(records[0]),
    records => { records[0].submittedTurn = 3; },
    records => { records[0].draftedTurn = 2; records[0].submittedTurn = 1; },
    records => { records[0].scopeId = 'unknown-scope'; },
    records => { records[0].effects = { treasury: 20 }; }
  ]) {
    const altered = JSON.parse(original);
    edit(altered.state.assembly.legislativeRecords);
    store.setItem(SAVE_KEY, JSON.stringify(altered));
    assert.equal(loadGame(store).replacementRequired, true);
  }
});

test('Assembly seat and record edits cannot bypass deterministic save validation', () => {
  const store = memoryStorage();
  saveGame(createInitialState({ mode: 'term' }), store);
  const saved = store.getItem(SAVE_KEY);
  const seatEdit = JSON.parse(saved);
  seatEdit.state.assembly.parties[0].seats += 5;
  seatEdit.state.assembly.parties[1].seats -= 5;
  store.setItem(SAVE_KEY, JSON.stringify(seatEdit));
  assert.equal(loadGame(store).replacementRequired, true);

  const recordEdit = JSON.parse(saved);
  recordEdit.state.assembly.legislativeRecords.push({ id: 'unrecorded-bill' });
  store.setItem(SAVE_KEY, JSON.stringify(recordEdit));
  assert.equal(loadGame(store).replacementRequired, true);
});

test('save corruption and incompatible versions are rejected without overwriting stored data', () => {
  const store = memoryStorage();
  saveGame(play('ARDEN-1'), store);
  const valid = store.getItem(SAVE_KEY);
  const tampered = JSON.parse(valid);
  tampered.state.meters.treasury += 1;
  store.setItem(SAVE_KEY, JSON.stringify(tampered));
  assert.equal(loadGame(store).state, null);
  assert.ok(loadGame(store).message);
  assert.equal(store.getItem(SAVE_KEY), JSON.stringify(tampered));
  const incompatible = JSON.parse(valid); incompatible.contentVersion = 99;
  store.setItem(SAVE_KEY, JSON.stringify(incompatible));
  assert.equal(loadGame(store).state, null);
  store.setItem(SAVE_KEY, '{broken');
  assert.equal(loadGame(store).state, null);
});

test('blocked storage leaves the engine playable and quick mode preserves the saved term', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
  assert.equal(loadGame(blocked).available, false);
  assert.equal(saveGame(createInitialState({ mode: 'term' }), blocked).ok, false);
  assert.equal(play('ARDEN-1').phase, 'result');
  const store = memoryStorage();
  saveGame(createInitialState({ mode: 'term' }), store);
  const before = store.getItem(SAVE_KEY);
  saveGame(createInitialState(), store);
  assert.equal(store.getItem(SAVE_KEY), before);
});
