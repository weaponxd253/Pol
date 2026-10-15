import { CONTENT_VERSION, RULES_VERSION } from './content.js';
import { createInitialState, selectResponse, beginPolicyPhase, selectPolicy, resolveTurn, advanceTurn } from './engine.js';

export const SAVE_KEY = 'policy-maker.first-term';
export const SAVE_VERSION = 1;
const storageMessage = 'Saving is unavailable in this browser. You can keep playing, but progress will not survive a reload.';
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

export function validateSavedState(raw) {
  if (!raw || raw.mode !== 'term' || typeof raw.seed !== 'string' || raw.seed.length > 64 || !Array.isArray(raw.history) || raw.history.length > 12 || raw.rulesVersion !== RULES_VERSION || raw.contentVersion !== CONTENT_VERSION) throw new Error('Incompatible saved term.');
  let restored = createInitialState({ mode: 'term', seed: raw.seed });
  for (let index = 0; index < raw.history.length; index++) {
    const report = raw.history[index];
    restored = resolveTurn(selectPolicy(beginPolicyPhase(selectResponse(restored, report.responseId)), report.policyId));
    if (index < raw.history.length - 1 || !['report', 'result'].includes(raw.phase)) restored = advanceTurn(restored);
  }
  if (raw.phase === 'result') restored = advanceTurn(restored);
  else if (raw.phase === 'event' || raw.phase === 'policy') {
    if (raw.selectedResponseId) restored = selectResponse(restored, raw.selectedResponseId);
    if (raw.phase === 'policy') {
      restored = beginPolicyPhase(restored);
      if (raw.selectedPolicyId) restored = selectPolicy(restored, raw.selectedPolicyId);
    }
  }
  if (canonical(restored) !== canonical(raw)) throw new Error('The saved term does not match its recorded decisions.');
  return restored;
}

export function loadGame(providedStorage) {
  let text;
  try { text = (providedStorage ?? globalThis.localStorage).getItem(SAVE_KEY); }
  catch { return { state: null, available: false, hasStoredGame: false, replacementRequired: false, message: storageMessage }; }
  if (!text) return { state: null, available: true, hasStoredGame: false, replacementRequired: false, message: null };
  try {
    if (text.length > 500000) throw new Error('Oversized save.');
    const saved = JSON.parse(text);
    if (saved.saveVersion !== SAVE_VERSION || saved.rulesVersion !== RULES_VERSION || saved.contentVersion !== CONTENT_VERSION) throw new Error('Incompatible save version.');
    return { state: validateSavedState(saved.state), available: true, hasStoredGame: true, replacementRequired: false, message: null };
  } catch { return { state: null, available: true, hasStoredGame: true, replacementRequired: true, message: 'The saved term is invalid or uses older rules. These consequences require a fresh term. Your stored run is kept until you choose to replace it.' }; }
}

export function saveGame(state, providedStorage) {
  if (state.mode !== 'term') return { ok: true };
  try {
    (providedStorage ?? globalThis.localStorage).setItem(SAVE_KEY, JSON.stringify({ saveVersion: SAVE_VERSION, rulesVersion: RULES_VERSION, contentVersion: CONTENT_VERSION, savedAt: new Date().toISOString(), state }));
    return { ok: true };
  } catch { return { ok: false, message: storageMessage }; }
}
