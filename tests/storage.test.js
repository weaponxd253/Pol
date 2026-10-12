import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, selectResponse, beginPolicyPhase, selectPolicy, resolveTurn, advanceTurn } from '../js/engine.js';
import { SAVE_KEY, loadGame, saveGame } from '../js/storage.js';
import { choose, play } from '../scripts/strategies.mjs';

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
    assert.equal(saveGame(snapshot, store).ok, true);
    assert.deepEqual(loadGame(store).state, snapshot);
  }
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
