
import { validateContent } from './content.js';

import {
  createInitialState,
  getEvent,
  getPolicies,
  policyDetails,
  selectResponse,
  beginPolicyPhase,
  selectPolicy,
  calculateTurn,
  resolveTurn,
  advanceTurn
} from './engine.js';

import { loadGame, saveGame } from './storage.js';
import { renderGame } from './view.js';
import { OfficeScene } from './office-scene.js';

// ==========================================
// EXISTING GOVERNMENT GAME
// ==========================================

validateContent();

const app = document.getElementById('app');
const announcer = document.getElementById('announcer');
const dialog = document.getElementById('replacement-dialog');
const policyDossierOptions =
  document.getElementById('policy-dossier-options');
const policyDossier =
  document.getElementById('policy-dossier');

const policyDossierClose =
  document.getElementById('policy-dossier-close');

const policyDossierApprove =
  document.getElementById('policy-dossier-approve');

const policyApprovalConfirmation =
  document.getElementById('policy-approval-confirmation');

const policyApprovalMessage =
  document.getElementById('policy-approval-message');

const policyApprovalConfirm =
  document.getElementById('policy-approval-confirm');

const policyApprovalCancel =
  document.getElementById('policy-approval-cancel');
// ==========================================
// CABINET PERFORMANCE REPORT ELEMENTS
// ==========================================

const cabinetReport =
  document.getElementById('cabinet-report');

// ==========================================
// GOVERNMENT ARCHIVES ELEMENTS
// ==========================================

const governmentArchives =
  document.getElementById('government-archives');

const archiveRecordList =
  document.getElementById('archive-record-list');

const archiveRecordDetail =
  document.getElementById('archive-record-detail');

const governmentArchivesClose =
  document.getElementById('government-archives-close');


const cabinetReportClose =
  document.getElementById('cabinet-report-close');

const cabinetReportNext =
  document.getElementById('cabinet-report-next');

const cabinetReportTurn =
  document.getElementById('cabinet-report-turn');

const cabinetReportSummary =
  document.getElementById('cabinet-report-summary');

const cabinetReportMeters =
  document.getElementById('cabinet-report-meters');

const cabinetReportBudget =
  document.getElementById('cabinet-report-budget');


// ==========================================
// PRESIDENTIAL HUD ELEMENTS
// ==========================================

const presidentialHud =
  document.getElementById('presidential-hud');

const hudExpandButton =
  document.getElementById('hud-expand-button');

const hudExpanded =
  document.getElementById('hud-expanded');

const hudExtraMeters =
  document.getElementById('hud-extra-meters');

const hudDebt =
  document.getElementById('hud-debt');

const hudUpcomingCommitments =
  document.getElementById('hud-upcoming-commitments');

const hudPhase =
  document.getElementById('hud-phase');

const hudTurn =
  document.getElementById('hud-turn');

const hudApproval =
  document.getElementById('hud-approval');

const hudTreasury =
  document.getElementById('hud-treasury');

const hudApprovalBar =
  document.getElementById('hud-approval-bar');

const hudTreasuryBar =
  document.getElementById('hud-treasury-bar');

const hudTreasuryMeter =
  document.getElementById('hud-treasury-meter');


// ==========================================
// PRESIDENTIAL OBJECTIVE ELEMENTS
// ==========================================

const presidentialObjective =
  document.getElementById('presidential-objective');

const objectiveTitle =
  document.getElementById('objective-title');

const objectiveDescription =
  document.getElementById('objective-description');

const objectiveLocation =
  document.getElementById('objective-location');

// Objective notification elements.

const objectiveNotice =
  document.getElementById('objective-notice');

const objectiveNoticeTitle =
  document.getElementById('objective-notice-title');

const objectiveNoticeLocation =
  document.getElementById('objective-notice-location');

// Track the last objective displayed.
let lastObjectiveKey = null;

// Timer used to hide the notification.
let objectiveNoticeTimer = null;





let storageStatus = loadGame();
let savedGame = storageStatus.state;
let state = null;
let replacement = null;


// ==========================================
// PHASE 5C.1 - INTERACTION AVAILABILITY
// ==========================================

window.getOfficeInteractionStatus = function (action) {

  // Leaving the office should always be allowed.
  if (action === 'exit-office') {
    return {
      allowed: true,
      reason: ''
    };
  }

  // Government activities require an active game.
  if (!state) {
    return {
      allowed: false,
      reason: 'Start or resume a presidency first.'
    };
  }

  // Archives can be visited during any active phase.
  if (action === 'archives') {
    return {
      allowed: true,
      reason: ''
    };
  }

  // Chief of Staff
  if (action === 'advisors') {
    return {
      allowed: state.phase === 'event',
      reason: 'No new briefing is available. Follow your current objective.'
    };
  }

  // National Policy Desk
  if (action === 'national-policies') {
    return {
      allowed: state.phase === 'policy',
      reason: state.phase === 'event'
        ? 'Finish your Chief of Staff briefing first.'
        : 'No policy decision is available right now.'
    };
  }

  // Cabinet Briefing Table
  if (action === 'cabinet-briefing') {
    return {
      allowed: state.phase === 'report',
      reason: 'Complete your current decisions before reviewing Cabinet results.'
    };
  }

  // Unknown actions should not be accepted.
  return {
    allowed: false,
    reason: 'This activity is not available.'
  };
};



// ==========================================
// PHASE 5B.2 - CONTEXTUAL OFFICE GUIDANCE
// ==========================================

window.getOfficeContextHint = function (action) {

  if (!state) {
    return 'Start or resume a presidency first.';
  }

  switch (action) {

    case 'advisors':
      if (state.phase === 'event') {
        return state.selectedResponseId
          ? 'Response selected. Complete your briefing.'
          : 'A national event requires your response.';
      }

      return state.phase === 'policy'
        ? 'Briefing complete. Visit the Policy Desk.'
        : 'No new briefing available.';

    case 'national-policies':
      if (state.phase === 'event') {
        return 'Finish your Chief of Staff briefing first.';
      }

      if (state.phase === 'policy') {
        return state.selectedPolicyId
          ? 'Review the forecast and approve your policy.'
          : 'Choose a policy to review its impact.';
      }

      return 'No new policy decisions available.';

    case 'cabinet-briefing':
      if (state.phase === 'report') {
        return 'Review results or advance to the next turn.';
      }

      return 'Complete your government decisions first.';

    case 'archives': {
      const count = state.history?.length || 0;

      return count > 0
        ? `${count} completed presidential records.`
        : 'No records yet. Complete your first turn.';
    }

    case 'exit-office':
      return 'Return to the government dashboard.';

    default:
      return 'Press E to interact.';
  }
};

// ==========================================
// PHASE 5B.3 - OBJECTIVE DESTINATION
// ==========================================

window.getOfficeObjectiveAction = function () {

  if (!state) {
    return null;
  }

  switch (state.phase) {

    case 'event':
      return 'advisors';

    case 'policy':
      return 'national-policies';

    case 'report':
      return 'cabinet-briefing';

    case 'result':
      return null;

    default:
      return null;
  }
};



const escape = value =>
  String(value).replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character])
  );

// Generate a new game seed.
function newSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);

  return values[0]
    .toString(16)
    .padStart(8, '0')
    .toUpperCase();
}

// Save full-term game progress.
function persist() {
  if (state?.mode !== 'term') return;

  const result = saveGame(state);

  savedGame = structuredClone(state);

  storageStatus = {
    ...storageStatus,
    available: result.ok,
    message: result.ok ? null : result.message,
    hasStoredGame:
      storageStatus.hasStoredGame || result.ok,
    replacementRequired:
      result.ok ? false : storageStatus.replacementRequired
  };
}

// Start a new government run.
function launch(mode, seed) {

  state = createInitialState({
    mode,
    seed: seed || newSeed()
  });

  persist();

  render({ focusHeading: true });

  announcer.textContent =
    mode === 'term'
      ? 'Your first term begins. Twelve turns; election target 50 Approval.'
      : 'The three-turn scenario begins. Treasury 24, debt zero.';
}

// Confirm before replacing an existing term.
function requestLaunch(mode, seed) {

  const active =
    state?.mode === 'term' ? state : savedGame;

  if (
    mode === 'term' &&
    (
      (active && !active.outcome) ||
      storageStatus.replacementRequired
    )
  ) {

    replacement = { mode, seed };

    document.getElementById(
      'replacement-copy'
    ).textContent =
      storageStatus.replacementRequired
        ? 'Your stored run uses older rules or cannot be restored. Starting a fresh term replaces it with the new consequence rules. Cancel to keep the stored data.'
        : 'This replaces your saved term at turn ' +
        active.turn +
        ' of 12. Keep the saved term to continue where you left off.';

    dialog.showModal();

  } else {
    launch(mode, seed);
  }
}

// Main menu HTML.
function menuMarkup() {

  const resume = savedGame
    ? `
      <section class="resume-card">
        <div>
          <span class="eyebrow">YOUR SAVED TERM</span>
          <h3>Turn ${savedGame.turn} of 12</h3>
          <p>${savedGame.outcome
      ? 'The result and your decisions are saved.'
      : `Approval ${savedGame.meters.approval} · Treasury ${savedGame.meters.treasury} · Your hand and choices are saved.`
    }</p>
        </div>
        <button
          class="button button-primary"
          data-action="resume"
          data-focus-key="resume">
          Resume term →
        </button>
      </section>
    `
    : '';

  return `
    <section class="mode-selection">
      <p class="eyebrow">THE EXECUTIVE OFFICE</p>

      <h2 id="phase-heading" tabindex="-1">
        Take office.
      </h2>

      <p class="panel-description">
        Choose your briefing. Every decision helps
        something and costs something else.
      </p>

      ${resume}

      <div class="mode-grid">

        <article class="mode-card mode-featured">
          <span class="eyebrow">THE FULL EXPERIENCE</span>

          <h3>Your First Term</h3>

          <p>
            Keep six competing pressures in balance,
            carry the cost of your promises,
            and face the electorate.
          </p>

          <ul>
            <li>12 turns · Four-card policy hand</li>
            <li>Lasting conditions · Follow-up decisions</li>
            <li>Autosave · Election target: 50 Approval</li>
          </ul>

          <button
            class="button button-primary"
            data-action="new-term"
            data-focus-key="new-term">
            Play a full term →
          </button>
        </article>

        <article class="mode-card">
          <span class="eyebrow">A QUICK INTRODUCTION</span>

          <h3>The First 90 Days</h3>

          <p>
            A short, fixed crisis. Learn the tradeoffs
            between public support, spending, and debt.
          </p>

          <ul>
            <li>3 turns · Six single-use policies</li>
            <li>Same scenario every time</li>
            <li>A fresh start on each reload</li>
          </ul>

          <button
            class="button button-secondary"
            data-action="quick"
            data-focus-key="quick">
            Try the three-turn scenario →
          </button>
        </article>

      </div>
    </section>
  `;
}


// ==========================================
// UPDATE EXPANDED GOVERNMENT STATUS
// ==========================================

function updateExpandedPresidentialHUD() {

  if (!state) {
    return;
  }

  // Clear previously generated statistics.
  hudExtraMeters.replaceChildren();

  // The four statistics not already shown
  // in the compact Presidential HUD.
  const extraMeters = [
    ['donors', 'Donors'],
    ['economy', 'Economy'],
    ['international', 'International'],
    ['stability', 'Stability']
  ];

  // ======================================
  // GENERATE ADDITIONAL STATISTIC BARS
  // ======================================

  for (const [key, label] of extraMeters) {

    const value = state.meters[key];

    const meter = document.createElement('div');
    meter.className = 'hud-extra-meter';

    // Identify low or critical values.
    if (value <= 0) {
      meter.classList.add('is-critical');
    } else if (value < 20) {
      meter.classList.add('is-low');
    }

    // Statistic label and current value.
    const labelRow = document.createElement('div');
    labelRow.className = 'hud-meter-label';

    const name = document.createElement('span');
    name.textContent = label;

    const amount = document.createElement('strong');
    amount.textContent = String(value);

    labelRow.append(name, amount);

    // Statistic progress bar.
    const bar = document.createElement('div');
    bar.className = 'hud-meter-bar';

    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', label);
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', String(value));

    const fill = document.createElement('div');
    fill.className = 'hud-meter-fill';

    fill.style.width =
      `${Math.max(0, Math.min(100, value))}%`;

    bar.appendChild(fill);

    // Add the completed meter to the panel.
    meter.append(labelRow, bar);

    hudExtraMeters.appendChild(meter);
  }

  // ======================================
  // NATIONAL DEBT
  // ======================================

  hudDebt.textContent = String(state.debt);

  // ======================================
  // UPCOMING GOVERNMENT COMMITMENTS
  // ======================================

  hudUpcomingCommitments.replaceChildren();

  const upcoming = [...(state.scheduledEffects || [])]
    .filter(effect => effect.dueTurn > state.turn)
    .sort((a, b) => a.dueTurn - b.dueTurn);

  if (upcoming.length === 0) {

    const empty = document.createElement('p');
    empty.className = 'hud-commitment-empty';

    empty.textContent =
      'No upcoming scheduled commitments.';

    hudUpcomingCommitments.appendChild(empty);

    return;
  }

  // Display the next three commitments.
  for (const effect of upcoming.slice(0, 3)) {

    const item = document.createElement('div');
    item.className = 'hud-commitment';

    const meterName =
      effect.meter.charAt(0).toUpperCase() +
      effect.meter.slice(1);

    const amount =
      effect.amount > 0
        ? `+${effect.amount}`
        : String(effect.amount);

    item.textContent =
      `Turn ${effect.dueTurn}: ` +
      `${effect.source} (${meterName} ${amount})`;

    hudUpcomingCommitments.appendChild(item);
  }

  // Let the player know if more commitments exist.
  if (upcoming.length > 3) {

    const more = document.createElement('p');
    more.className = 'hud-commitment-empty';

    more.textContent =
      `${upcoming.length - 3} more scheduled effects.`;

    hudUpcomingCommitments.appendChild(more);
  }
}

// ==========================================
// DISPLAY OBJECTIVE UPDATE NOTIFICATION
// ==========================================

function showObjectiveNotification(title, location) {

  // Fill the notification with the new objective.
  objectiveNoticeTitle.textContent = title;

  objectiveNoticeLocation.textContent =
    'Destination: ' + location;

  // Cancel an older hide timer, if one exists.
  if (objectiveNoticeTimer !== null) {
    clearTimeout(objectiveNoticeTimer);
  }

  // Show the notification.
  objectiveNotice.hidden = false;

  // Automatically hide it after four seconds.
  objectiveNoticeTimer = setTimeout(() => {

    objectiveNotice.hidden = true;
    objectiveNoticeTimer = null;

  }, 4000);
}


// ==========================================
// PHASE 5B - UPDATE PRESIDENTIAL OBJECTIVE
// ==========================================

function updatePresidentialObjective() {

  if (!state) {

    presidentialObjective.hidden = true;

    // Reset objective tracking.
    lastObjectiveKey = null;

    objectiveNotice.hidden = true;

    return;
  }

  let title = '';
  let description = '';
  let location = '';

  // ======================================
  // EVENT PHASE
  // ======================================

  if (state.phase === 'event') {

    if (state.selectedResponseId) {

      title = 'Complete Your Briefing';

      description =
        'Your response has been selected. ' +
        'Return to the Chief of Staff briefing ' +
        'and continue to the policy phase.';

    } else {

      title = 'Meet with Chief of Staff';

      description =
        'A new national event requires your attention. ' +
        'Approach the advisor area and press E ' +
        'to receive your briefing.';

    }

    location = 'Advisor Meeting Area';
  }

  // ======================================
  // POLICY PHASE
  // ======================================

  else if (state.phase === 'policy') {

    if (state.selectedPolicyId) {

      title = 'Approve Selected Policy';

      description =
        'You have selected a government policy. ' +
        'Review its projected effects at the ' +
        'National Policy Desk and approve it.';

    } else {

      title = 'Review National Policies';

      description =
        'Your advisor briefing is complete. ' +
        'Approach the National Policy Desk ' +
        'and press E to review available policies.';

    }

    location = 'National Policy Desk';
  }

  // ======================================
  // REPORT PHASE
  // ======================================

  else if (state.phase === 'report') {

    title = 'Review Cabinet Results';

    description =
      'Your policy has been enacted. ' +
      'Visit the Cabinet Briefing Table to ' +
      'review the results and advance your presidency.';

    location = 'Cabinet Briefing Table';
  }

  // ======================================
  // FINAL RESULT
  // ======================================

  else if (state.phase === 'result') {

    title = 'Review Presidential Legacy';

    description =
      'Your presidency has concluded. ' +
      'Review the final results of your administration.';

    location = 'Final Results';
  }

  // ======================================
  // FALLBACK
  // ======================================

  else {

    title = 'Presidential Duties';

    description =
      'Review the current state of your administration.';

    location = 'Executive Office';
  }

  // ======================================
  // UPDATE THE OBJECTIVE PANEL
  // ======================================

  objectiveTitle.textContent = title;

  objectiveDescription.textContent = description;

  objectiveLocation.textContent = location;

  presidentialObjective.hidden = false;

  // ======================================
  // DETECT OBJECTIVE CHANGES
  // ======================================

  // Include the turn number so that receiving a new
  // briefing next turn counts as a new objective.
  const objectiveKey =
    `${state.turn}:${title}:${location}`;

  // Check whether the player is currently in the office.
  const officeVisible =
    document.getElementById('office-screen')?.hidden === false;

  // Only notify when an existing objective changes.
  // Don't display a notification on the initial render.
  if (
    lastObjectiveKey !== null &&
    lastObjectiveKey !== objectiveKey &&
    officeVisible &&
    state.phase !== 'result'
  ) {
    showObjectiveNotification(title, location);
  }

  // Save the current objective for future comparisons.
  lastObjectiveKey = objectiveKey;

}



// ==========================================
// UPDATE PRESIDENTIAL STATUS HUD
// ==========================================

function updatePresidentialHUD() {

  if (!state) {

    presidentialHud.hidden = true;

    updatePresidentialObjective();

    return;
  }

  presidentialHud.hidden = false;

  // ======================================
  // TURN INFORMATION
  // ======================================

  const totalTurns =
    state.mode === 'quick' ? 3 : 12;

  hudTurn.textContent =
    `Turn ${state.turn} of ${totalTurns}`;

  // ======================================
  // CURRENT GOVERNMENT PHASE
  // ======================================

  const phaseNames = {
    event: 'BRIEFING',
    policy: 'POLICY REVIEW',
    report: 'REPORT READY',
    result: 'TERM COMPLETE'
  };

  hudPhase.textContent =
    phaseNames[state.phase] || 'GOVERNING';

  // ======================================
  // APPROVAL
  // ======================================

  const approval = state.meters.approval;

  hudApproval.textContent = approval;

  hudApprovalBar.querySelector(
    '.hud-meter-fill'
  ).style.width =
    `${Math.max(0, Math.min(100, approval))}%`;

  hudApprovalBar.setAttribute(
    'aria-valuenow',
    String(approval)
  );

  // ======================================
  // TREASURY
  // ======================================

  const treasury = state.meters.treasury;

  hudTreasury.textContent = treasury;

  hudTreasuryBar.querySelector(
    '.hud-meter-fill'
  ).style.width =
    `${Math.max(0, Math.min(100, treasury))}%`;

  hudTreasuryBar.setAttribute(
    'aria-valuenow',
    String(treasury)
  );

  // ======================================
  // TREASURY WARNINGS
  // ======================================

  hudTreasuryMeter.classList.toggle(
    'is-low',
    treasury > 0 && treasury < 20
  );

  hudTreasuryMeter.classList.toggle(
    'is-critical',
    treasury <= 0
  );

  updateExpandedPresidentialHUD();

  updatePresidentialObjective();


}


// ==========================================
// TOGGLE EXPANDED PRESIDENTIAL STATUS
// ==========================================

hudExpandButton.addEventListener('click', () => {

  // Determine whether the expanded panel
  // is currently visible.
  const isExpanded = !hudExpanded.hidden;

  // Toggle its visibility.
  hudExpanded.hidden = isExpanded;

  // Update accessibility information.
  hudExpandButton.setAttribute(
    'aria-expanded',
    String(!isExpanded)
  );

  // Update the button label.
  hudExpandButton.textContent = isExpanded
    ? 'View Government Status'
    : 'Hide Government Status';

});



// Render existing game interface.
function render({ focusHeading = false } = {}) {

  const focusKey =
    document.activeElement?.dataset.focusKey;

  const quick = state?.mode === 'quick';

  document.title = quick
    ? 'Policy-Maker — The First 90 Days'
    : 'Policy-Maker — Your First Term';

  document.getElementById('game-title').innerHTML =
    quick
      ? 'The First <em>90 Days.</em>'
      : 'Your First <em>Term.</em>';

  document.querySelector('.intro-copy').textContent =
    quick
      ? 'Every promise has a price. Keep your nation standing through three turns of competing pressures.'
      : 'Every promise has a price. Keep your nation standing—and earn another mandate.';

  document.querySelector('.scenario-tag').textContent =
    state
      ? quick ? 'OPENING CRISIS' : 'FIRST TERM'
      : 'REPUBLIC OF ARDEN';

  document.querySelector(
    '[data-action="restart"]'
  ).hidden = !state;

  document.querySelector(
    '[data-action="menu"]'
  ).hidden = !state;

  document.getElementById('briefing-extra').textContent =
    quick
      ? 'All six policies are available once. Survive three turns to complete the opening crisis.'
      : 'Keep three policy cards and draw a replacement after playing one. Earlier policies can change future events or reserve a follow-up decision within your twelve turns. Inspect conditions and commitments before choosing. Finish with at least 50 Approval to win re-election.';

  const notice =
    storageStatus.message &&
      (!state || state.mode === 'term')
      ? '<p class="storage-notice" role="status">' +
      escape(storageStatus.message) +
      '</p>'
      : '';

  app.innerHTML =
    notice +
    (
      state
        ? renderGame(state, {
          saveEnabled: storageStatus.available
        })
        : menuMarkup()
    );

  if (focusHeading) {

    document.getElementById(
      'phase-heading'
    ).focus({ preventScroll: true });

    document.querySelector(
      state ? '.turn-bar' : '.introduction'
    ).scrollIntoView({
      block: 'start',
      behavior: 'instant'
    });

  } else if (focusKey) {

    document.querySelector(
      `[data-focus-key="${focusKey}"]`
    )?.focus({ preventScroll: true });
  }

  updatePresidentialHUD();
}

// ==========================================
// EXISTING BUTTON ACTIONS
// ==========================================

dialog.addEventListener('cancel', () => {
  replacement = null;
});

document.addEventListener('click', event => {

  const button = event.target.closest(
    'button[data-action]'
  );

  if (!button || button.disabled) return;

  let focusHeading = false;

  try {

    switch (button.dataset.action) {

      case 'new-term':
        requestLaunch('term');
        return;

      case 'quick':
        launch('quick');
        return;

      case 'resume':
        state = structuredClone(savedGame);
        render({ focusHeading: true });
        announcer.textContent =
          'Your saved term is restored, including the current phase and choices.';
        return;

      case 'menu':
        state = null;
        render({ focusHeading: true });
        return;

      case 'restart':
        if (!state) return;
        requestLaunch(state.mode, state.seed);
        return;

      case 'cancel-replace':
        replacement = null;
        dialog.close();
        return;

      case 'confirm-replace': {
        const pending = replacement;
        replacement = null;
        dialog.close();

        if (pending) {
          launch(pending.mode, pending.seed);
        }
        return;
      }

      case 'response':
        state = selectResponse(
          state,
          button.dataset.id
        );

        announcer.textContent =
          getEvent(state).responses.find(
            choice => choice.id === state.selectedResponseId
          ).title + ' selected.';
        break;

      case 'begin-policy':
        state = beginPolicyPhase(state);
        focusHeading = true;

        announcer.textContent =
          'Event response locked. Choose a policy to see the complete forecast.';
        break;

      case 'policy': {
        state = selectPolicy(
          state,
          button.dataset.id
        );

        const preview = calculateTurn(state);

        announcer.textContent =
          preview.policyTitle +
          ' selected. Projected Treasury ' +
          preview.meters.treasury +
          ', debt ' +
          preview.debt +
          '.' +
          (
            preview.failures.length
              ? ' Warning: ' +
              preview.failures.map(
                failure => failure.label
              ).join(', ') +
              ' reaches zero.'
              : ''
          );
        break;
      }

      case 'resolve':
        state = resolveTurn(state);
        focusHeading = true;

        announcer.textContent =
          state.outcome === 'collapsed'
            ? state.history.at(-1).failures.map(
              failure => failure.failure
            ).join(' ')
            : 'Turn ' + state.turn +
            ' resolved. Treasury ' +
            state.meters.treasury +
            ', Approval ' +
            state.meters.approval + '.';
        break;

      case 'advance':
        state = advanceTurn(state);
        focusHeading = true;

        announcer.textContent =
          state.phase === 'result'
            ? 'Run complete: ' + state.outcome + '.'
            : 'Turn ' + state.turn +
            '. A new event requires your response.';
        break;

      default:
        return;
    }

    persist();
    render({ focusHeading });

  } catch (error) {
    announcer.textContent = error.message;
    console.error(error);
  }
});

// Display the original government game.
render();

// ==========================================
// NEW PHASER OFFICE INTEGRATION
// ==========================================

const Phaser = window.Phaser;

let officeGame = null;

const officeScreen =
  document.getElementById('office-screen');

const officeMessage =
  document.getElementById('office-message');

const enterOfficeButton =
  document.getElementById('enter-office');

const officeBackButton =
  document.getElementById('office-back');

const officeDialogue =
  document.getElementById('office-dialogue');

const officeDialogueClose =
  document.getElementById('office-dialogue-close');

const advisorEventTitle =
  document.getElementById('advisor-event-title');

const advisorEventDescription =
  document.getElementById('advisor-event-description');

const advisorResponseOptions =
  document.getElementById('advisor-response-options');

const advisorFeedback =
  document.getElementById('advisor-feedback');

const advisorContinue =
  document.getElementById('advisor-continue');


// ==========================================
// PHASE 5C.2 - OFFICE OVERLAY MANAGER
// ==========================================

// Every interactive office overlay.
const OFFICE_OVERLAYS = [
  {
    element: officeDialogue,
    focus: officeDialogueClose
  },
  {
    element: policyDossier,
    focus: policyDossierClose
  },
  {
    element: cabinetReport,
    focus: cabinetReportClose
  },
  {
    element: governmentArchives,
    focus: governmentArchivesClose
  }
];

// Find the currently visible overlay.
function getActiveOfficeOverlay() {

  const active = OFFICE_OVERLAYS.find(
    item => !item.element.hidden
  );

  return active?.element ?? null;
}

// Keep Phaser movement synchronized with
// the office screen and open overlays.
function syncOfficeScenePause() {

  if (!officeGame) {
    return;
  }

  const shouldPause =
    officeScreen.hidden ||
    getActiveOfficeOverlay() !== null;

  if (
    shouldPause &&
    officeGame.scene.isActive('OfficeScene')
  ) {
    officeGame.scene.pause('OfficeScene');
  }

  if (
    !shouldPause &&
    officeGame.scene.isPaused('OfficeScene')
  ) {
    officeGame.scene.resume('OfficeScene');
  }
}

// Open one overlay and pause the office.
function openOfficeOverlay(element, focusElement) {

  // Do not allow two interfaces at once.
  if (getActiveOfficeOverlay()) {
    return false;
  }

  element.hidden = false;

  syncOfficeScenePause();

  focusElement?.focus();

  return true;
}


// ==========================================
// PHASE 5C.3C - RESTORE GAME INPUT FOCUS
// ==========================================

function closeOfficeOverlay(element, focusElement) {

  // Hide the currently open interface.
  element.hidden = true;

  // Restore Phaser movement when appropriate.
  syncOfficeScenePause();

  // Remove focus from the closed interface.
  focusElement?.blur();

  // Don't focus the game if we've left the office.
  if (officeScreen.hidden) {
    return;
  }

  // Return keyboard focus to the Phaser canvas.
  const canvas = officeGame?.canvas;

  if (canvas) {

    canvas.tabIndex = 0;

    canvas.focus({
      preventScroll: true
    });
  }
}


// Reset every office overlay when leaving
// the executive office.
function closeAllOfficeOverlays() {

  for (const overlay of OFFICE_OVERLAYS) {
    overlay.element.hidden = true;
  }

  resetPolicyApproval();

  syncOfficeScenePause();
}


// Open the executive office.
function enterOffice() {

  if (!Phaser) {
    console.error('Phaser failed to load.');

    if (officeMessage) {
      officeMessage.textContent =
        'Phaser failed to load. Check the browser console.';
    }

    return;
  }

  officeScreen.hidden = false;
  app.hidden = true;
  enterOfficeButton.hidden = true;

  officeMessage.textContent =
    'WASD or arrow keys to move. E to interact. C to view collisions.';

  // Initialize Phaser only once.
  if (!officeGame) {

    officeGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'office-game',
      width: 960,
      height: 720,
      backgroundColor: '#17251f',
      pixelArt: true,
      roundPixels: true,

      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },

      scene: [OfficeScene]
    });

  } else {

    syncOfficeScenePause();

  }

  populatePolicyDossier();
}


function returnToBriefing() {

  // Hide the graphical office first.
  officeScreen.hidden = true;

  // Clear all overlays and ensure Phaser pauses.
  closeAllOfficeOverlays();

  // Restore the original strategy interface.
  app.hidden = false;
  enterOfficeButton.hidden = false;

  // Refresh without resetting the presidency.
  render({ focusHeading: true });
}


// ==========================================
// RPG DIALOGUE FUNCTIONS
// ==========================================


function updatePolicyForecast() {

  const panel = document.getElementById(
    'policy-dossier-forecast'
  );

  // Clear the previous forecast.
  panel.replaceChildren();

  const heading = document.createElement('h4');
  heading.textContent = 'Government Impact Forecast';
  panel.appendChild(heading);

  // No policy has been selected yet.
  if (
    !state ||
    state.phase !== 'policy' ||
    !state.selectedPolicyId
  ) {
    const message = document.createElement('p');
    message.textContent =
      'Select a policy to review its projected effects.';

    panel.appendChild(message);
    return;
  }

  // Read the forecast from the existing engine.
  let forecast;

  try {
    forecast = calculateTurn(state);
  } catch (error) {
    const message = document.createElement('p');
    message.textContent = error.message;
    panel.appendChild(message);
    return;
  }

  const selectedTitle = document.createElement('p');
  selectedTitle.textContent =
    'Selected: ' + forecast.policyTitle;

  panel.appendChild(selectedTitle);

  // Names of the six national statistics.
  const meters = {
    approval: 'Approval',
    treasury: 'Treasury',
    donors: 'Donors',
    economy: 'Economy',
    international: 'International',
    stability: 'Stability'
  };

  const grid = document.createElement('div');
  grid.className = 'policy-forecast-grid';

  for (const [key, label] of Object.entries(meters)) {

    const before = state.meters[key];
    const after = forecast.meters[key];
    const change = after - before;

    const cell = document.createElement('div');
    cell.className = 'policy-forecast-meter';

    const name = document.createElement('span');
    name.textContent = label;

    const value = document.createElement('strong');
    value.textContent =
      `${before} → ${after} (${change > 0 ? '+' : ''}${change})`;

    if (change > 0) {
      value.className = 'forecast-positive';
    } else if (change < 0) {
      value.className = 'forecast-negative';
    }

    cell.append(name, value);
    grid.appendChild(cell);
  }

  panel.appendChild(grid);

  // Projected national debt.
  const debt = document.createElement('p');
  debt.className = 'policy-forecast-debt';
  debt.textContent =
    `National Debt: ${state.debt} → ${forecast.debt}`;

  panel.appendChild(debt);

  // Budget forecast, separate from the policy effects.
  const budget = document.createElement('p');
  budget.className = 'policy-forecast-budget';
  budget.textContent =
    `Budget: Revenue ${forecast.budget.revenue}, ` +
    `Essential Spending ${forecast.budget.spending}, ` +
    `Interest ${forecast.budget.interest}, ` +
    `Net ${forecast.budget.total}`;

  panel.appendChild(budget);

  // Warn the player if the turn would cause collapse.
  if (forecast.failures.length > 0) {

    const warning = document.createElement('p');
    warning.className = 'policy-forecast-warning';

    warning.textContent =
      'Warning: This decision would cause government ' +
      'collapse. Critical statistics: ' +
      forecast.failures.map(item => item.label).join(', ');

    panel.appendChild(warning);
  }
}


function resetPolicyApproval() {

  // Hide any unfinished confirmation.
  policyApprovalConfirmation.hidden = true;

  // A policy can only be approved during policy phase.
  const canApprove =
    state &&
    state.phase === 'policy' &&
    Boolean(state.selectedPolicyId);

  policyDossierApprove.disabled = !canApprove;
}

function populatePolicyDossier() {

  // Remove any policy cards from a previous visit.
  policyDossierOptions.replaceChildren();

  resetPolicyApproval();

  // Display an explanation when policies cannot be reviewed.
  if (!state || state.phase !== 'policy') {
    const message = document.createElement('p');

    message.className = 'policy-dossier-placeholder';

    message.textContent = !state
      ? 'Begin or resume a presidency to review policies.'
      : 'Complete your advisor briefing before reviewing policies.';

    policyDossierOptions.appendChild(message);
    updatePolicyForecast();
    return;
  }

  // Get policies from the existing simulation engine.
  const policies = getPolicies(state)
    .filter(policy =>
      state.mode === 'quick' ||
      state.hand.includes(policy.id)
    )
    .map(policy => policyDetails(state, policy));

  // Create one document card per policy.
  for (const policy of policies) {

    // Create a clickable policy card.
    const card = document.createElement('button');

    card.type = 'button';
    card.className = 'policy-dossier-card';

    // Store the policy's unique ID.
    card.dataset.policyId = policy.id;

    // Check whether this policy is already selected.
    const selected = state.selectedPolicyId === policy.id;

    card.setAttribute('aria-pressed', String(selected));

    // Prevent unavailable policies from being selected.
    card.disabled = Boolean(policy.disabledReason);

    const title = document.createElement('h4');
    title.textContent = policy.title;

    const description = document.createElement('p');
    description.textContent = policy.description;

    // Format the immediate effects.
    const effects = document.createElement('div');
    effects.className = 'policy-dossier-effects';

    for (const [meter, amount] of Object.entries(policy.effects)) {

      if (amount === 0) continue;

      const chip = document.createElement('span');

      chip.className = amount > 0
        ? 'policy-effect-positive'
        : 'policy-effect-negative';

      const name = meter.charAt(0).toUpperCase() +
        meter.slice(1);

      const value = amount > 0
        ? `+${amount}`
        : String(amount);

      chip.textContent = `${name} ${value}`;

      effects.appendChild(chip);
    }

    // Display future consequences.
    const consequence = document.createElement('p');
    consequence.className = 'policy-dossier-consequence';

    consequence.textContent = policy.consequence;

    card.append(title, description, effects, consequence);

    // Explain restrictions without changing the game state.
    if (policy.disabledReason) {
      card.classList.add('policy-dossier-disabled');

      const restriction = document.createElement('p');
      restriction.className = 'policy-dossier-restriction';
      restriction.textContent = policy.disabledReason;

      card.appendChild(restriction);
    }

    // Select this policy when the player clicks the card.
    card.addEventListener('click', () => {

      try {
        // Update the existing government state.
        state = selectPolicy(state, policy.id);

        // Save the selection.
        persist();

        // Refresh the original government interface.
        render();

        // Redraw cards to show which one is selected.
        populatePolicyDossier();

        // Restore keyboard focus to the selected card.
        const selectedCard = [
          ...policyDossierOptions.querySelectorAll(
            '.policy-dossier-card'
          )
        ].find(element =>
          element.dataset.policyId === policy.id
        );

        selectedCard?.focus();

      } catch (error) {
        announcer.textContent = error.message;
        console.error(error);
      }

    });

    policyDossierOptions.appendChild(card);
  }

  // Refresh the forecast after displaying the policy cards.
  updatePolicyForecast();
}


function openPolicyDossier() {

  if (getActiveOfficeOverlay()) {
    return;
  }

  populatePolicyDossier();

  openOfficeOverlay(
    policyDossier,
    policyDossierClose
  );
}



function closePolicyDossier() {

  resetPolicyApproval();

  closeOfficeOverlay(
    policyDossier,
    policyDossierClose
  );
}


policyDossierApprove.addEventListener('click', () => {

  // A valid policy must be selected first.
  if (
    !state ||
    state.phase !== 'policy' ||
    !state.selectedPolicyId
  ) {
    return;
  }

  try {

    // Validate the selection using the simulation engine.
    const forecast = calculateTurn(state);

    // Explain exactly what the player is approving.
    policyApprovalMessage.textContent =
      `Approve "${forecast.policyTitle}" and resolve ` +
      `Turn ${state.turn}? ` +
      'The projected changes will become official. ' +
      'This decision cannot be undone.';

    // Show the confirmation section.
    policyApprovalConfirmation.hidden = false;

    // Make the confirmation visible in the scroll area.
    policyApprovalConfirmation.scrollIntoView({
      block: 'nearest'
    });

    policyApprovalConfirm.focus({
      preventScroll: true
    });

  } catch (error) {

    announcer.textContent = error.message;
    console.error(error);

  }

});

policyApprovalCancel.addEventListener('click', () => {

  // Hide confirmation without changing game state.
  policyApprovalConfirmation.hidden = true;

  // Return focus to the approval button.
  policyDossierApprove.focus();

});

// ==========================================
// CANCEL POLICY APPROVAL
// ==========================================

policyApprovalCancel.addEventListener('click', () => {

  policyApprovalConfirmation.hidden = true;

  policyDossierApprove.focus();

});


// ==========================================
// CONFIRM AND ENACT POLICY
// ==========================================

policyApprovalConfirm.addEventListener('click', () => {

  // Prevent duplicate or invalid approvals.
  if (
    policyApprovalConfirmation.hidden ||
    !state ||
    state.phase !== 'policy' ||
    !state.selectedPolicyId
  ) {
    return;
  }

  try {

    // Officially enact the selected policy.
    state = resolveTurn(state);

    // Save the updated presidency.
    persist();

    // Close the dossier and resume character movement.
    closePolicyDossier();

    // Refresh the original government interface in the background.
    render();

    // Direct the player to the Cabinet Briefing Table.
    officeMessage.textContent =
      'Policy enacted. Approach the Cabinet Briefing Table ' +
      'and press E to review your government report.';

    // Announce the successful decision.
    announcer.textContent =
      'Policy approved. Turn ' +
      state.turn +
      ' has been resolved.';

  } catch (error) {

    announcer.textContent = error.message;
    console.error(error);

  }

});

function populateCabinetReport() {

  // Reports are only available after resolving a turn.
  if (!state || state.phase !== 'report') {
    return false;
  }

  // Read the most recent completed government report.
  const report = state.history.at(-1);

  if (!report) {
    return false;
  }

  // ======================================
  // REPORT HEADING
  // ======================================

  cabinetReportTurn.textContent =
    `Presidential Term - Turn ${report.turn}`;

  // ======================================
  // PRESIDENTIAL DECISIONS
  // ======================================

  cabinetReportSummary.replaceChildren();

  const decisions = [
    ['Event', report.eventTitle],
    ['Response', report.responseTitle],
    ['Policy Enacted', report.policyTitle]
  ];

  for (const [label, value] of decisions) {

    const line = document.createElement('p');

    const strong = document.createElement('strong');
    strong.textContent = label + ': ';

    line.append(strong, document.createTextNode(value));

    cabinetReportSummary.appendChild(line);
  }

  // ======================================
  // NATIONAL PERFORMANCE
  // ======================================

  cabinetReportMeters.replaceChildren();

  const meters = {
    approval: 'Approval',
    treasury: 'Treasury',
    donors: 'Donors',
    economy: 'Economy',
    international: 'International',
    stability: 'Stability'
  };

  for (const [key, label] of Object.entries(meters)) {

    const before = report.startMeters[key];
    const after = report.meters[key];
    const change = after - before;

    const row = document.createElement('div');
    row.className = 'cabinet-report-meter-row';

    const name = document.createElement('strong');
    name.textContent = label;

    const values = document.createElement('span');
    values.textContent =
      `${before} → ${after} ` +
      `(${change > 0 ? '+' : ''}${change})`;

    values.className = change > 0
      ? 'forecast-positive'
      : change < 0
        ? 'forecast-negative'
        : '';

    row.append(name, values);

    // Explain which effects caused the change.
    const causes = report.contributions[key];

    if (causes.length > 0) {

      const explanation = document.createElement('small');

      explanation.textContent = causes
        .map(effect =>
          `${effect.source}: ` +
          `${effect.amount > 0 ? '+' : ''}${effect.amount}`
        )
        .join(' · ');

      row.appendChild(explanation);
    }

    cabinetReportMeters.appendChild(row);
  }

  // ======================================
  // TREASURY AND DEBT
  // ======================================

  cabinetReportBudget.replaceChildren();

  const financials = [
    ['Debt', `${report.startDebt} → ${report.debt}`],
    ['Revenue', report.budget.revenue],
    ['Essential Spending', report.budget.spending],
    ['Interest', report.budget.interest],
    ['Scheduled Payments', report.budget.commitments],
    ['Net Budget Change', report.budget.total]
  ];

  for (const [label, value] of financials) {

    const line = document.createElement('p');

    const strong = document.createElement('strong');
    strong.textContent = label + ': ';

    line.append(
      strong,
      document.createTextNode(String(value))
    );

    cabinetReportBudget.appendChild(line);
  }

  // ======================================
  // FUTURE OBLIGATIONS
  // ======================================

  const obligations = report.remainingScheduled || [];

  if (obligations.length > 0) {

    const heading = document.createElement('h4');
    heading.textContent = 'Future Commitments';

    cabinetReportBudget.appendChild(heading);

    for (const obligation of obligations) {

      const line = document.createElement('p');

      line.textContent =
        `Turn ${obligation.dueTurn}: ` +
        `${obligation.source} - ` +
        `${obligation.meter} ` +
        `${obligation.amount > 0 ? '+' : ''}` +
        obligation.amount;

      cabinetReportBudget.appendChild(line);
    }
  }

  // ======================================
  // GOVERNMENT COLLAPSE WARNING
  // ======================================

  if (report.failures.length > 0) {

    const warning = document.createElement('p');
    warning.className = 'cabinet-report-warning';

    warning.textContent =
      'Government collapse: ' +
      report.failures.map(item => item.label).join(', ');

    cabinetReportBudget.appendChild(warning);
  }

  return true;
}

function openCabinetReport() {

  console.log('Cabinet report debug:', {
    hasActiveGame: Boolean(state),
    currentPhase: state?.phase,
    hasSavedGame: Boolean(savedGame),
    savedPhase: savedGame?.phase,
    reportCount: state?.history?.length
  });

  // Only allow reports after the turn is resolved.
  if (!state || state.phase !== 'report') {

    officeMessage.textContent =
      'Complete your government decisions before ' +
      'reviewing the Cabinet Report.';

    return;
  }

  // Load the latest report.
  if (!populateCabinetReport()) {
    officeMessage.textContent =
      'No completed report is available.';
    return;
  }


  // Prepare the turn advancement button.
  // An ended presidency should display its final result
  // instead of starting another event.
  cabinetReportNext.textContent =
    state.outcome
      ? 'View Final Result'
      : 'Next Turn';

  cabinetReportNext.disabled = false;

  // Show the completed Cabinet Report.
  cabinetReport.hidden = false;

  openOfficeOverlay(
    cabinetReport,
    cabinetReportClose
  );
  // Focus the Close button when the report opens.
  cabinetReportClose.focus();

}


function closeCabinetReport() {

  // Hide the report.
  cabinetReport.hidden = true;

  // Resume player movement.
  if (officeGame?.scene.isPaused('OfficeScene')) {
    officeGame.scene.resume('OfficeScene');
  }

  cabinetReportClose.blur();
}

// Close the Cabinet Report using its button.
cabinetReportClose.addEventListener(
  'click',
  closeCabinetReport
);


// ==========================================
// ADVANCE TO THE NEXT PRESIDENTIAL TURN
// ==========================================

cabinetReportNext.addEventListener('click', () => {

  // Only advance from an open, completed report.
  if (
    cabinetReport.hidden ||
    !state ||
    state.phase !== 'report'
  ) {
    return;
  }

  try {

    // Advance using the existing simulation engine.
    // This must only happen once per completed report.
    state = advanceTurn(state);

    // Save the updated presidency.
    persist();

    // Refresh the original government interface
    // without making it visible.
    render();

    // Close the report and resume Phaser movement.
    closeCabinetReport();

    // ======================================
    // PRESIDENCY HAS ENDED
    // ======================================

    if (state.phase === 'result') {

      // For now, use the existing final result screen.
      // A dedicated RPG result screen can come later.
      returnToBriefing();

      announcer.textContent =
        'Your presidency has concluded. ' +
        'Review your final government results.';

      return;
    }

    // ======================================
    // NEXT TURN HAS BEGUN
    // ======================================

    // Tell the president where to go next.
    officeMessage.textContent =
      `Turn ${state.turn} has begun. ` +
      'Visit the Chief of Staff for your next briefing.';

    announcer.textContent =
      `Turn ${state.turn} has begun. ` +
      'A new government event is available.';

    console.log('Presidency advanced:', {
      turn: state.turn,
      phase: state.phase,
      reports: state.history.length
    });

  } catch (error) {

    announcer.textContent = error.message;

    console.error(
      'Failed to advance presidential turn:',
      error
    );

  }

});


function addArchiveDetailLine(container, label, value) {

  const line = document.createElement('p');
  line.className = 'archive-detail-line';

  const heading = document.createElement('strong');
  heading.textContent = label + ': ';

  const content = document.createElement('span');
  content.textContent = String(value ?? 'Not recorded');

  line.append(heading, content);
  container.appendChild(line);
}


function showArchiveRecord(index) {

  // Read one historical report.
  const report = state?.history?.[index];

  if (!report) {
    return;
  }

  // Clear the previously selected record.
  archiveRecordDetail.replaceChildren();

  // Highlight the selected record in the left column.
  for (const button of archiveRecordList.querySelectorAll(
    '.archive-record-button'
  )) {
    const selected =
      Number(button.dataset.recordIndex) === index;

    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }

  // ======================================
  // RECORD HEADING
  // ======================================

  const heading = document.createElement('h3');

  heading.textContent =
    `Presidential Record No. ${String(report.turn).padStart(3, '0')}`;

  archiveRecordDetail.appendChild(heading);

  // ======================================
  // DECISIONS
  // ======================================

  const decisionsHeading = document.createElement('h4');
  decisionsHeading.textContent = 'Presidential Decisions';

  archiveRecordDetail.appendChild(decisionsHeading);

  addArchiveDetailLine(
    archiveRecordDetail,
    'National Event',
    report.eventTitle
  );

  addArchiveDetailLine(
    archiveRecordDetail,
    'Presidential Response',
    report.responseTitle
  );

  addArchiveDetailLine(
    archiveRecordDetail,
    'Policy Enacted',
    report.policyTitle
  );

  // ======================================
  // NATIONAL STATISTICS
  // ======================================

  const statisticsHeading = document.createElement('h4');
  statisticsHeading.textContent = 'National Performance';

  archiveRecordDetail.appendChild(statisticsHeading);

  const meterNames = {
    approval: 'Approval',
    treasury: 'Treasury',
    donors: 'Donors',
    economy: 'Economy',
    international: 'International',
    stability: 'Stability'
  };

  for (const [key, label] of Object.entries(meterNames)) {

    const before = report.startMeters[key];
    const after = report.meters[key];
    const change = after - before;

    const row = document.createElement('div');
    row.className = 'archive-meter-row';

    const name = document.createElement('strong');
    name.textContent = label;

    const values = document.createElement('span');

    values.textContent =
      `${before} → ${after} ` +
      `(${change > 0 ? '+' : ''}${change})`;

    values.className =
      change > 0 ? 'archive-positive' :
        change < 0 ? 'archive-negative' : '';

    const explanation = document.createElement('small');

    const causes = report.contributions[key] || [];

    explanation.textContent = causes.length
      ? causes.map(effect =>
        `${effect.source}: ` +
        `${effect.amount > 0 ? '+' : ''}${effect.amount}`
      ).join(' · ')
      : 'No changes this turn.';

    row.append(name, values, explanation);

    archiveRecordDetail.appendChild(row);
  }

  // ======================================
  // FINANCIAL RESULTS
  // ======================================

  const financeHeading = document.createElement('h4');
  financeHeading.textContent = 'Treasury & National Debt';

  archiveRecordDetail.appendChild(financeHeading);

  addArchiveDetailLine(
    archiveRecordDetail,
    'National Debt',
    `${report.startDebt} → ${report.debt}`
  );

  addArchiveDetailLine(
    archiveRecordDetail,
    'Revenue',
    report.budget.revenue
  );

  addArchiveDetailLine(
    archiveRecordDetail,
    'Essential Spending',
    report.budget.spending
  );

  addArchiveDetailLine(
    archiveRecordDetail,
    'Interest',
    report.budget.interest
  );

  addArchiveDetailLine(
    archiveRecordDetail,
    'Scheduled Payments',
    report.budget.commitments
  );

  addArchiveDetailLine(
    archiveRecordDetail,
    'Net Budget Change',
    report.budget.total
  );

  // ======================================
  // FUTURE COMMITMENTS AT THAT TIME
  // ======================================

  const commitmentsHeading = document.createElement('h4');
  commitmentsHeading.textContent =
    'Commitments After This Turn';

  archiveRecordDetail.appendChild(commitmentsHeading);

  const obligations = report.remainingScheduled || [];

  if (obligations.length === 0) {

    const empty = document.createElement('p');
    empty.textContent =
      'No future scheduled commitments were recorded.';

    archiveRecordDetail.appendChild(empty);

  } else {

    for (const obligation of obligations) {

      addArchiveDetailLine(
        archiveRecordDetail,
        `Turn ${obligation.dueTurn}`,
        `${obligation.source}: ` +
        `${obligation.meter} ` +
        `${obligation.amount > 0 ? '+' : ''}` +
        obligation.amount
      );

    }
  }

  // ======================================
  // HISTORICAL GOVERNMENT COLLAPSE
  // ======================================

  if (report.failures?.length > 0) {

    const warning = document.createElement('p');
    warning.className = 'archive-record-warning';

    warning.textContent =
      'Government collapse: ' +
      report.failures.map(item => item.label).join(', ');

    archiveRecordDetail.appendChild(warning);
  }

  // Start at the top of the selected record.
  archiveRecordDetail.scrollTop = 0;
}


function populateGovernmentArchives() {

  // Clear any previously displayed records.
  archiveRecordList.replaceChildren();
  archiveRecordDetail.replaceChildren();

  // Handle a missing presidency.
  if (!state) {

    archiveRecordDetail.textContent =
      'Start or resume a presidency to view government records.';

    return;
  }

  // Read the completed turn history.
  const reports = state.history || [];

  // Handle a presidency with no completed turns.
  if (reports.length === 0) {

    archiveRecordDetail.textContent =
      'No presidential records are available yet. ' +
      'Complete your first turn to create an archive entry.';

    return;
  }

  // Display newest records first.
  for (let index = reports.length - 1; index >= 0; index--) {

    const report = reports[index];

    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'archive-record-button';
    button.dataset.recordIndex = index;

    const title = document.createElement('strong');

    title.textContent =
      `Presidential Record No. ${String(report.turn).padStart(3, '0')}`;

    const description = document.createElement('small');
    description.textContent = report.eventTitle;

    button.append(title, description);

    // Clicking the record displays its historical details.
    button.addEventListener('click', () => {

      showArchiveRecord(index);

    });

    archiveRecordList.appendChild(button);
  }

  // Automatically display the newest completed record.
  showArchiveRecord(reports.length - 1);
}

function openGovernmentArchives() {

  if (getActiveOfficeOverlay()) {
    return;
  }

  populateGovernmentArchives();

  openOfficeOverlay(
    governmentArchives,
    governmentArchivesClose
  );
}


function closeGovernmentArchives() {

  closeOfficeOverlay(
    governmentArchives,
    governmentArchivesClose
  );
}


governmentArchivesClose.addEventListener(
  'click',
  closeGovernmentArchives
);






function showAdvisorEvent() {

  // Clear the previous event's response buttons.
  advisorResponseOptions.replaceChildren();

  advisorFeedback.textContent = '';
  advisorContinue.hidden = true;

  // No government run has been started or resumed yet.
  if (!state) {
    advisorEventTitle.textContent = 'No active term';

    advisorEventDescription.textContent =
      'Begin or resume your presidency before receiving a briefing.';

    return;
  }

  if (state.phase === 'policy') {
    advisorEventTitle.textContent =
      'Briefing Complete';

    advisorEventDescription.textContent =
      'Your response has been recorded. Please proceed ' +
      'to the National Policy Desk to review and approve ' +
      'your next government policy.';

    return;
  }

  if (state.phase !== 'event') {
    advisorEventTitle.textContent =
      'No New Briefing';

    advisorEventDescription.textContent =
      'There are no additional event decisions available ' +
      'at this stage of your presidency.';

    return;
  }

  // Read the actual event from the game engine.
  const currentEvent = getEvent(state);

  advisorEventTitle.textContent =
    currentEvent.title;

  advisorEventDescription.textContent =
    currentEvent.description;

  // Generate a button for every event response.
  for (const response of currentEvent.responses) {

    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'advisor-choice';
    button.dataset.responseId = response.id;

    const selected =
      state.selectedResponseId === response.id;

    button.setAttribute(
      'aria-pressed',
      String(selected)
    );

    // Response title.
    const title = document.createElement('strong');
    title.textContent = response.title;

    // Format the government's meter changes.
    const effects = Object.entries(response.effects)
      .filter(([, value]) => value !== 0)
      .map(([meter, value]) => {

        const label =
          meter.charAt(0).toUpperCase() +
          meter.slice(1);

        const amount =
          value > 0 ? `+${value}` : `${value}`;

        return `${label} ${amount}`;
      })
      .join(' · ');

    const details = document.createElement('small');
    details.textContent = effects;

    button.append(title, details);

    // Make the choice use the REAL game engine.
    button.addEventListener('click', () => {

      try {
        state = selectResponse(
          state,
          response.id
        );

        // Save the selected response.
        persist();

        // Update the original government screen too.
        render();

        // Redraw selected button appearance.
        showAdvisorEvent();

        advisorFeedback.textContent =
          `${response.title} selected.`;

        // Restore focus to the selected choice.
        const selectedButton = [
          ...advisorResponseOptions.children
        ].find(element =>
          element.dataset.responseId === response.id
        );

        selectedButton?.focus();

      } catch (error) {
        advisorFeedback.textContent = error.message;
        console.error(error);
      }
    });

    advisorResponseOptions.appendChild(button);
  }

  // Player may continue after choosing a response.
  advisorContinue.hidden = !state.selectedResponseId;
}

function openAdvisorDialogue() {

  if (getActiveOfficeOverlay()) {
    return;
  }

  showAdvisorEvent();

  openOfficeOverlay(
    officeDialogue,
    officeDialogueClose
  );
}


function closeAdvisorDialogue() {

  closeOfficeOverlay(
    officeDialogue,
    officeDialogueClose
  );
}


// Close dialogue when clicking the button.
officeDialogueClose.addEventListener(
  'click',
  closeAdvisorDialogue
);

policyDossierClose.addEventListener(
  'click',
  closePolicyDossier
);


// ==========================================
// PHASE 5C.2 - CENTRAL ESCAPE HANDLER
// ==========================================

document.addEventListener('keydown', event => {

  if (
    event.key !== 'Escape' ||
    officeScreen.hidden
  ) {
    return;
  }

  const activeOverlay =
    getActiveOfficeOverlay();

  // No office overlay is currently open.
  if (!activeOverlay) {
    return;
  }

  event.preventDefault();

  // Close only the currently active overlay.
  if (activeOverlay === policyDossier) {

    closePolicyDossier();

  } else if (activeOverlay === cabinetReport) {

    closeCabinetReport();

  } else if (activeOverlay === governmentArchives) {

    closeGovernmentArchives();

  } else if (activeOverlay === officeDialogue) {

    closeAdvisorDialogue();
  }
});


// ==========================================
// CONTINUE TO POLICIES BUTTON
// ==========================================

advisorContinue.addEventListener('click', () => {

  // Make sure a valid response has been selected.
  if (
    !state ||
    state.phase !== 'event' ||
    !state.selectedResponseId
  ) {
    return;
  }

  try {
    // Lock in the event response and enter policy phase.
    state = beginPolicyPhase(state);

    // Save progress.
    persist();

    // Update the original government interface in the background.
    render();

    // Close the advisor dialogue and resume Phaser.
    closeAdvisorDialogue();

    // Tell the player where to go next.
    officeMessage.textContent =
      'Briefing complete. Approach the National Policy Desk ' +
      'and press E to review your policies.';

  } catch (error) {
    advisorFeedback.textContent = error.message;
    console.error(error);
  }
});

// ==========================================
// ESCAPE KEY HANDLER
// ==========================================


// Office button handlers.
enterOfficeButton.addEventListener(
  'click',
  enterOffice
);

officeBackButton.addEventListener(
  'click',
  returnToBriefing
);

// Receive interactions from OfficeScene.
window.addEventListener(
  'government:office-action',
  event => {

    const action = event.detail.action;

    // Ignore new interactions while an office
    // dialogue or document is already open.
    if (getActiveOfficeOverlay()) {
      return;
    }


    // ======================================
    // CHECK INTERACTION AVAILABILITY
    // ======================================


    // ==========================================
    // PHASE 5C.3B - LOCKED INTERACTION FEEDBACK
    // ==========================================

    const status =
      window.getOfficeInteractionStatus(action);

    if (!status.allowed) {

      // Explain why the interaction is unavailable.
      officeMessage.textContent = status.reason;

      // Also announce the reason for accessibility.
      announcer.textContent = status.reason;

      return;
    }



    switch (action) {

      case 'national-policies':
        openPolicyDossier();
        break;

      case 'exit-office':

        // Return to the main strategy interface.
        returnToBriefing();
        break;

      case 'cabinet-briefing':
        openCabinetReport();

        break;

      case 'archives':

        openGovernmentArchives();

        break;

      case 'advisors':

        openAdvisorDialogue();
        break;

      default:

        console.warn(
          'Unknown office interaction:',
          action
        );
    }
  }
);
