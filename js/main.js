import { validateContent } from './content.js';
import { createInitialState, getEvent, selectResponse, beginPolicyPhase, selectPolicy, calculateTurn, resolveTurn, advanceTurn } from './engine.js';
import { loadGame, saveGame } from './storage.js';
import { renderGame } from './view.js';

validateContent();
const app = document.getElementById('app');
const announcer = document.getElementById('announcer');
const dialog = document.getElementById('replacement-dialog');
let storageStatus = loadGame();
let savedGame = storageStatus.state;
let state = null;
let replacement = null;
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

function newSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0].toString(16).padStart(8, '0').toUpperCase();
}
function persist() {
  if (state?.mode !== 'term') return;
  const result = saveGame(state);
  savedGame = structuredClone(state);
  storageStatus = { ...storageStatus, available: result.ok, message: result.ok ? null : result.message,
    hasStoredGame: storageStatus.hasStoredGame || result.ok, replacementRequired: result.ok ? false : storageStatus.replacementRequired };
}
function launch(mode, seed) {
  state = createInitialState({ mode, seed: seed || newSeed() });
  persist();
  render({ focusHeading: true });
  announcer.textContent = mode === 'term' ? 'Your first term begins. Twelve turns; election target 50 Approval.' : 'The three-turn scenario begins. Treasury 24, debt zero.';
}
function requestLaunch(mode, seed) {
  const active = state?.mode === 'term' ? state : savedGame;
  if (mode === 'term' && ((active && !active.outcome) || storageStatus.replacementRequired)) {
    replacement = { mode, seed };
    document.getElementById('replacement-copy').textContent = storageStatus.replacementRequired
      ? 'Your stored run uses older rules or cannot be restored. Starting a fresh term replaces it with the new consequence rules. Cancel to keep the stored data.'
      : 'This replaces your saved term at turn ' + active.turn + ' of 12. Keep the saved term to continue where you left off.';
    dialog.showModal();
  } else launch(mode, seed);
}
function menuMarkup() {
  const resume = savedGame ? '<section class="resume-card"><div><span class="eyebrow">YOUR SAVED TERM</span><h3>Turn ' + savedGame.turn + ' of 12</h3><p>' + (savedGame.outcome ? 'The result and your decisions are saved.' : 'Approval ' + savedGame.meters.approval + ' · Treasury ' + savedGame.meters.treasury + ' · Your hand and choices are saved.') + '</p></div><button class="button button-primary" data-action="resume" data-focus-key="resume">Resume term →</button></section>' : '';
  return '<section class="mode-selection"><p class="eyebrow">THE EXECUTIVE OFFICE</p><h2 id="phase-heading" tabindex="-1">Take office.</h2><p class="panel-description">Choose your briefing. Every decision helps something and costs something else.</p>' + resume +
    '<div class="mode-grid"><article class="mode-card mode-featured"><span class="eyebrow">THE FULL EXPERIENCE</span><h3>Your First Term</h3><p>Keep six competing pressures in balance, carry the cost of your promises, and face the electorate.</p><ul><li>12 turns · Four-card policy hand</li><li>Lasting conditions · Follow-up decisions</li><li>Autosave · Election target: 50 Approval</li></ul><button class="button button-primary" data-action="new-term" data-focus-key="new-term">Play a full term →</button></article>' +
    '<article class="mode-card"><span class="eyebrow">A QUICK INTRODUCTION</span><h3>The First 90 Days</h3><p>A short, fixed crisis. Learn the tradeoffs between public support, spending, and debt.</p><ul><li>3 turns · Six single-use policies</li><li>Same scenario every time</li><li>A fresh start on each reload</li></ul><button class="button button-secondary" data-action="quick" data-focus-key="quick">Try the three-turn scenario →</button></article></div></section>';
}
function render({ focusHeading = false } = {}) {
  const focusKey = document.activeElement?.dataset.focusKey;
  const quick = state?.mode === 'quick';
  document.title = quick ? 'Policy-Maker — The First 90 Days' : 'Policy-Maker — Your First Term';
  document.getElementById('game-title').innerHTML = quick ? 'The First <em>90 Days.</em>' : 'Your First <em>Term.</em>';
  document.querySelector('.intro-copy').textContent = quick ? 'Every promise has a price. Keep your nation standing through three turns of competing pressures.' : 'Every promise has a price. Keep your nation standing—and earn another mandate.';
  document.querySelector('.scenario-tag').textContent = state ? quick ? 'OPENING CRISIS' : 'FIRST TERM' : 'REPUBLIC OF ARDEN';
  document.querySelector('[data-action="restart"]').hidden = !state;
  document.querySelector('[data-action="menu"]').hidden = !state;
  document.getElementById('briefing-extra').textContent = quick ? 'All six policies are available once. Survive three turns to complete the opening crisis.' : 'Keep three policy cards and draw a replacement after playing one. Earlier policies can change future events or reserve a follow-up decision within your twelve turns. Inspect conditions and commitments before choosing. Finish with at least 50 Approval to win re-election.';
  const notice = storageStatus.message && (!state || state.mode === 'term') ? '<p class="storage-notice" role="status">' + escape(storageStatus.message) + '</p>' : '';
  app.innerHTML = notice + (state ? renderGame(state, { saveEnabled: storageStatus.available }) : menuMarkup());
  if (focusHeading) {
    document.getElementById('phase-heading').focus({ preventScroll: true });
    document.querySelector(state ? '.turn-bar' : '.introduction').scrollIntoView({ block: 'start', behavior: 'instant' });
  } else if (focusKey) document.querySelector('[data-focus-key="' + focusKey + '"]')?.focus({ preventScroll: true });
}

dialog.addEventListener('cancel', () => { replacement = null; });
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  let focusHeading = false;
  try {
    switch (button.dataset.action) {
      case 'new-term': requestLaunch('term'); return;
      case 'quick': launch('quick'); return;
      case 'resume': state = structuredClone(savedGame); render({ focusHeading: true }); announcer.textContent = 'Your saved term is restored, including the current phase and choices.'; return;
      case 'menu': state = null; render({ focusHeading: true }); return;
      case 'restart':
        if (!state) return;
        requestLaunch(state.mode, state.seed); return;
      case 'cancel-replace': replacement = null; dialog.close(); return;
      case 'confirm-replace': {
        const pending = replacement;
        replacement = null;
        dialog.close();
        if (pending) launch(pending.mode, pending.seed);
        return;
      }
      case 'response':
        state = selectResponse(state, button.dataset.id);
        announcer.textContent = getEvent(state).responses.find(choice => choice.id === state.selectedResponseId).title + ' selected.';
        break;
      case 'begin-policy':
        state = beginPolicyPhase(state); focusHeading = true;
        announcer.textContent = 'Event response locked. Choose a policy to see the complete forecast.';
        break;
      case 'policy': {
        state = selectPolicy(state, button.dataset.id);
        const preview = calculateTurn(state);
        announcer.textContent = preview.policyTitle + ' selected. Projected Treasury ' + preview.meters.treasury + ', debt ' + preview.debt + '.' + (preview.failures.length ? ' Warning: ' + preview.failures.map(failure => failure.label).join(', ') + ' reaches zero.' : '');
        break;
      }
      case 'resolve':
        state = resolveTurn(state); focusHeading = true;
        announcer.textContent = state.outcome === 'collapsed' ? state.history.at(-1).failures.map(failure => failure.failure).join(' ') : 'Turn ' + state.turn + ' resolved. Treasury ' + state.meters.treasury + ', Approval ' + state.meters.approval + '.';
        break;
      case 'advance':
        state = advanceTurn(state); focusHeading = true;
        announcer.textContent = state.phase === 'result' ? 'Run complete: ' + state.outcome + '.' : 'Turn ' + state.turn + '. A new event requires your response.';
        break;
      default: return;
    }
    persist();
    render({ focusHeading });
  } catch (error) {
    announcer.textContent = error.message;
    console.error(error);
  }
});
render();
