
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

let storageStatus = loadGame();
let savedGame = storageStatus.state;
let state = null;
let replacement = null;

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

    // Resume existing scene and player position.
    if (officeGame.scene.isPaused('OfficeScene')) {
      officeGame.scene.resume('OfficeScene');
    }
  }

  populatePolicyDossier();
}

// Return to existing policy screens.
function returnToBriefing() {
  officeDialogue.hidden = true;

  if (
    officeGame &&
    officeGame.scene.isActive('OfficeScene')
  ) {
    officeGame.scene.pause('OfficeScene');
  }

  officeScreen.hidden = true;
  app.hidden = false;
  enterOfficeButton.hidden = false;

  // Refresh game UI without resetting game state.
  render({ focusHeading: true });
}


// ==========================================
// RPG DIALOGUE FUNCTIONS
// ==========================================

function populatePolicyDossier() {

    // Remove any policy cards from a previous visit.
    policyDossierOptions.replaceChildren();

    // Display an explanation when policies cannot be reviewed.
    if (!state || state.phase !== 'policy') {
        const message = document.createElement('p');

        message.className = 'policy-dossier-placeholder';

        message.textContent = !state
            ? 'Begin or resume a presidency to review policies.'
            : 'Complete your advisor briefing before reviewing policies.';

        policyDossierOptions.appendChild(message);
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

        const card = document.createElement('article');
        card.className = 'policy-dossier-card';

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

        policyDossierOptions.appendChild(card);
    }
}


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

  // The advisor presents decisions only during event phase.
  if (state.phase !== 'event') {
    advisorEventTitle.textContent =
      'No new briefing available';

    advisorEventDescription.textContent =
      'Your current event has already moved forward. Continue your existing government decisions.';

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

// Show the advisor dialogue.
function openAdvisorDialogue() {

  showAdvisorEvent();


  // Make the HTML dialogue visible.
  officeDialogue.hidden = false;

  // Pause the Phaser scene.
  // The player cannot walk while talking.
  if (officeGame?.scene.isActive('OfficeScene')) {
    officeGame.scene.pause('OfficeScene');
  }

  // Move keyboard focus into the dialogue.
  officeDialogueClose.focus();
}

// Close the advisor dialogue.
function closeAdvisorDialogue() {

  // Hide the HTML dialogue.
  officeDialogue.hidden = true;

  // Resume Phaser movement.
  if (officeGame?.scene.isPaused('OfficeScene')) {
    officeGame.scene.resume('OfficeScene');
  }

  officeDialogueClose.blur();
}

// Close dialogue when clicking the button.
officeDialogueClose.addEventListener(
  'click',
  closeAdvisorDialogue
);

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

    // Hide the advisor dialogue.
    officeDialogue.hidden = true;

    // Open the existing policy selection screen.
    returnToBriefing();

  } catch (error) {
    advisorFeedback.textContent = error.message;
    console.error(error);
  }
});

// ==========================================
// ESCAPE KEY HANDLER
// ==========================================

document.addEventListener('keydown', event => {

  if (
    event.key === 'Escape' &&
    !officeDialogue.hidden
  ) {
    closeAdvisorDialogue();
  }
});

// Also support Escape.
document.addEventListener('keydown', event => {

  if (
    event.key === 'Escape' &&
    !officeDialogue.hidden
  ) {
    closeAdvisorDialogue();
  }
});


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

    switch (action) {

      case 'national-policies':

        // Show the current game decision screen.
        // If no run is active, show mode selection.
        returnToBriefing();
        break;

      case 'exit-office':

        // Return to the main strategy interface.
        returnToBriefing();
        break;

      case 'cabinet-briefing':

        officeMessage.textContent =
          'Cabinet briefings are not connected yet.';
        break;

      case 'archives':

        officeMessage.textContent =
          'Government archives are not connected yet.';
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
