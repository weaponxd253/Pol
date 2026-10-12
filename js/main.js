import { METERS, POLICIES, TOTAL_TURNS, validateContent } from './content.js';
import { createInitialState, getEvent, selectResponse, beginPolicyPhase, selectPolicy, calculateTurn, resolveTurn, advanceTurn, forecastBudget } from './engine.js';

validateContent();
let state = createInitialState();
const app = document.getElementById('app');
const announcer = document.getElementById('announcer');
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const signed = value => value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0';
const meterFor = id => METERS.find(meter => meter.id === id);

const iconPaths = {
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/>',
  vault: '<path d="m3 8 9-5 9 5M4 10h16M6 12v7m6-7v7m6-7v7M3 21h18"/>',
  handshake: '<path d="m2 11 4-6 5 2 3-2 4 1 4 6-3 7-3 2-6-1-5-4Z"/><path d="m8 9 4-2 5 5-3 3-3-2m3 2 3 3m-6-1 3 3M5 15l3-5"/>',
  chart: '<path d="M4 4v16h16M7 14l4-4 4 3 5-7m-5 0h5v5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.5 7.5 12 12m-12-3 12-12"/>',
  document: '<path d="M6 3h8l4 4v14H6ZM14 3v5h4M9 12h6m-6 4h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  alert: '<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v.1"/>',
};

function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.document}</svg>`;
}

function effectChips(effects, debt = 0) {
  const entries = Object.entries(effects).map(([id, amount]) => ({ label: meterFor(id).short, amount, good: amount > 0 }));
  if (debt) entries.push({ label: 'Debt', amount: debt, good: false });
  return `<span class="effect-list">${entries.map(effect => `<span class="effect ${effect.good ? 'effect-good' : 'effect-bad'}">${escape(effect.label)} <strong>${signed(effect.amount)}</strong></span>`).join('')}</span>`;
}

function renderMeters() {
  return `<section class="meter-section" aria-label="Current national outlook"><div class="section-label"><span>${state.phase === 'result' ? 'FINAL NATIONAL OUTLOOK' : 'NATIONAL OUTLOOK'}</span><span>ACTUAL VALUES <span aria-hidden="true">·</span> 0–100</span></div><div class="meter-grid">${METERS.map(meter => {
    const value = state.meters[meter.id];
    const low = value < 20;
    return `<article class="meter-card ${low ? 'meter-low' : ''} ${value === 0 ? 'meter-failed' : ''}" data-meter="${meter.id}"><div class="meter-name">${icon(meter.icon)}<span>${meter.short}</span>${low ? `<span class="meter-warning">${value === 0 ? 'CRISIS' : 'LOW'}</span>` : ''}</div><div class="meter-number"><strong data-meter-value="${meter.id}">${value}</strong><span>/ 100</span></div><div class="meter-track" role="meter" aria-label="${escape(meter.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><span style="width:${value}%"></span></div><p class="meter-caption">${meter.id === 'treasury' ? `Debt <strong data-debt-value>${state.debt}</strong>` : escape(meter.description)}</p></article>`;
  }).join('')}</div></section>`;
}

function renderProgress() {
  const current = { event: 0, policy: 1, report: 2, result: 3 }[state.phase];
  return `<div class="turn-bar"><div class="turn-label"><span class="turn-dot"></span><strong>${state.phase === 'result' ? 'SCENARIO COMPLETE' : `TURN ${state.turn} OF ${TOTAL_TURNS}`}</strong><span class="day-range">${state.phase === 'result' ? `${state.turn * 30} days in office` : `Days ${(state.turn - 1) * 30 + 1}–${state.turn * 30}`}</span></div><ol class="phase-steps" aria-label="Turn progress">${['Event', 'Policy', 'Report'].map((label, index) => `<li class="${index === current ? 'step-active' : index < current ? 'step-done' : ''}" ${index === current ? 'aria-current="step"' : ''}><span>${index < current ? icon('check') : index + 1}</span>${label}</li>`).join('')}</ol></div>`;
}

function eventPanel() {
  const event = getEvent(state);
  return `<section class="panel decision-panel"><div class="panel-kicker"><span class="eyebrow">01 <span class="kicker-divider">/</span> EVENT BRIEFING</span><span class="category">${escape(event.category)}</span></div><div class="event-heading"><div><h2 id="phase-heading" tabindex="-1">${escape(event.title)}</h2><p class="panel-description">${escape(event.description)}</p></div><span class="event-symbol">${icon(event.icon)}</span></div><p class="choice-label">CHOOSE YOUR RESPONSE</p><div class="response-grid" role="group" aria-label="Event responses">${event.responses.map((response, index) => {
    const selected = response.id === state.selectedResponseId;
    return `<button type="button" class="choice-card response-card ${selected ? 'selected' : ''}" data-action="response" data-id="${response.id}" data-focus-key="response-${response.id}" aria-label="${escape(response.title)}" aria-pressed="${selected}"><span class="card-top"><span class="option-label">OPTION ${index + 1}</span><span class="selection-dot">${selected ? icon('check') : ''}</span></span><span class="card-title">${escape(response.title)}</span><span class="card-description">${escape(response.description)}</span>${effectChips(response.effects)}${response.condition ? `<span class="future-note">${icon('clock')}<span>${escape(response.condition)}</span></span>` : ''}</button>`;
  }).join('')}</div><div class="panel-bottom"><p>${icon('document')} Your policy decision comes next.</p><button class="button button-primary" type="button" data-action="begin-policy" data-focus-key="begin-policy" ${!state.selectedResponseId ? 'disabled' : ''}>Choose policy ${icon('arrow')}</button></div></section>`;
}

function previewMarkup(preview) {
  if (!preview) return `<div class="preview-placeholder">${icon('document')}<p>Select a policy to see the full outcome before you commit.</p></div>`;
  return `<section class="outcome-preview" aria-label="Projected meter values"><div class="preview-heading"><strong>Projected outcome</strong><span>AFTER BOTH CHOICES & BUDGET</span></div><div class="projection-grid">${METERS.map(meter => {
    const delta = preview.meters[meter.id] - state.meters[meter.id];
    const capped = preview.rawMeters[meter.id] > 100;
    return `<div class="projected-meter ${preview.meters[meter.id] < 20 ? 'projected-low' : ''}"><span>${meter.short}</span><strong>${state.meters[meter.id]} <span aria-hidden="true">→</span> <span data-projected-value="${meter.id}">${preview.meters[meter.id]}</span></strong><small class="${delta > 0 ? 'text-good' : delta < 0 ? 'text-bad' : ''}">${delta ? signed(delta) : 'No change'}${capped ? ' · capped at 100' : ''}${preview.meters[meter.id] < 20 ? preview.meters[meter.id] === 0 ? ' · CRISIS' : ' · LOW' : ''}</small></div>`;
  }).join('')}</div>${preview.failures.length ? `<div class="warning-box" role="note">${icon('alert')}<div><strong>This combination will collapse your government.</strong><p>${preview.failures.map(failure => `${escape(failure.label)} reaches zero${failure.shortfall ? ` with a shortfall of ${failure.shortfall}` : ''}.`).join(' ')} Choose another policy to change the outcome.</p></div></div>` : ''}</section>`;
}

function policyPanel(preview) {
  const event = getEvent(state);
  const response = event.responses.find(choice => choice.id === state.selectedResponseId);
  return `<section class="panel decision-panel"><div class="panel-kicker"><span class="eyebrow">02 <span class="kicker-divider">/</span> POLICY DECISION</span><span class="category">${6 - state.usedPolicyIds.length} policies available</span></div><h2 id="phase-heading" tabindex="-1">Choose a policy</h2><p class="panel-description">Repair the damage or pursue a strategy. Every policy can be used once.</p><div class="locked-response">${icon('check')}<div><span>EVENT RESPONSE LOCKED IN</span><strong>${escape(response.title)}</strong>${effectChips(response.effects)}</div></div><div class="policy-grid" role="group" aria-label="Policy choices">${POLICIES.map(policy => {
    const selected = state.selectedPolicyId === policy.id;
    const used = state.usedPolicyIds.includes(policy.id);
    return `<button type="button" class="choice-card policy-card ${selected ? 'selected' : ''} ${used ? 'used' : ''}" data-action="policy" data-id="${policy.id}" data-focus-key="policy-${policy.id}" aria-label="${escape(policy.title)}" aria-pressed="${selected}" ${used ? 'disabled' : ''}><span class="card-top"><span class="policy-icon">${icon(policy.icon)}</span><span class="option-label">${used ? 'ALREADY USED' : escape(policy.category)}</span><span class="selection-dot">${selected || used ? icon('check') : ''}</span></span><span class="card-title">${escape(policy.title)}</span><span class="card-description">${escape(policy.description)}</span>${effectChips(policy.effects, policy.debt)}<span class="future-note ${policy.future.length || policy.debt ? 'has-cost' : ''}">${icon('clock')}<span>${escape(policy.consequence)}</span></span></button>`;
  }).join('')}</div>${previewMarkup(preview)}<div class="panel-bottom"><p>${icon('clock')} Known future costs stay with your government.</p><button class="button button-primary ${preview?.failures.length ? 'button-danger' : ''}" type="button" data-action="resolve" data-focus-key="resolve" ${!preview ? 'disabled' : ''}>Resolve turn ${icon('arrow')}</button></div></section>`;
}

function failureDescription(report) {
  return report.failures.map(failure => `${failure.failure}${failure.shortfall ? ` ${failure.label} has a shortfall of ${failure.shortfall}.` : ''}`).join(' ');
}

function reportPanel() {
  const report = state.history.at(-1);
  return `<section class="panel report-panel"><div class="panel-kicker"><span class="eyebrow">03 <span class="kicker-divider">/</span> TURN REPORT</span><span class="category">Days ${(state.turn - 1) * 30 + 1}–${state.turn * 30}</span></div><h2 id="phase-heading" tabindex="-1">${report.failures.length ? 'Your government has collapsed.' : `Turn ${state.turn}, resolved.`}</h2><p class="panel-description">${report.failures.length ? escape(failureDescription(report)) : 'Your decisions are settled. Here is what changed, and why.'}</p><div class="decision-receipt"><div><span>EVENT RESPONSE</span><strong>${escape(report.responseTitle)}</strong></div><div><span>POLICY ENACTED</span><strong>${escape(report.policyTitle)}</strong></div></div><div class="report-table-wrap"><table class="report-table"><caption class="sr-only">Turn ${state.turn} meter changes and their causes</caption><thead><tr><th scope="col">Meter & causes</th><th scope="col">Before</th><th scope="col">After</th><th scope="col">Change</th></tr></thead><tbody>${METERS.map(meter => {
    const delta = report.meters[meter.id] - report.startMeters[meter.id];
    const explanations = report.contributions[meter.id];
    return `<tr><th scope="row"><span class="report-meter-name">${icon(meter.icon)} ${escape(meter.label)}</span><span class="report-causes">${explanations.length ? explanations.map(effect => `${escape(effect.source)} ${signed(effect.amount)}`).join(' <span aria-hidden="true">·</span> ') : 'No change this turn.'}${report.rawMeters[meter.id] > 100 ? ` · ${report.rawMeters[meter.id] - 100} above the cap was not applied.` : ''}${report.rawMeters[meter.id] < 0 ? ` · Shortfall: ${-report.rawMeters[meter.id]}.` : ''}</span></th><td>${report.startMeters[meter.id]}</td><td class="${report.meters[meter.id] < 20 ? 'text-bad' : ''}">${report.meters[meter.id]}${report.meters[meter.id] < 20 ? '<small class="report-low">LOW</small>' : ''}</td><td class="${delta > 0 ? 'text-good' : delta < 0 ? 'text-bad' : ''}">${signed(delta)}</td></tr>`;
  }).join('')}</tbody></table></div><div class="debt-receipt">${icon('document')}<span>Debt: <strong>${report.startDebt} → ${report.debt}</strong>${report.newDebt ? ` · ${report.newDebt} borrowed; interest is included in this budget.` : ' · No new borrowing.'}</span></div><div class="panel-bottom"><p>${icon(report.failures.length ? 'alert' : 'check')}${state.outcome ? 'Your opening-crisis result is ready.' : 'Future costs remain in your next budget.'}</p><button class="button button-primary" type="button" data-action="advance" data-focus-key="advance">${state.outcome ? 'View result' : 'Next turn'} ${icon('arrow')}</button></div></section>`;
}

function resultPanel() {
  const collapsed = state.outcome === 'collapsed';
  const lastReport = state.history.at(-1);
  return `<section class="panel result-panel"><div class="result-seal ${collapsed ? 'result-seal-failed' : ''}">${icon(collapsed ? 'alert' : 'shield')}</div><p class="eyebrow">${collapsed ? 'GOVERNMENT COLLAPSE' : 'THE FIRST 90 DAYS · COMPLETE'}</p><h2 id="phase-heading" tabindex="-1">${collapsed ? 'Government collapsed.' : 'Opening crisis survived.'}</h2><p class="result-description">${collapsed ? escape(failureDescription(lastReport)) : 'You kept every part of your government standing. The crisis is over, but your debt and commitments remain.'}</p><div class="result-summary"><div><span>PUBLIC APPROVAL</span><strong>${state.meters.approval}<small>/ 100</small></strong></div><div><span>FUNDS AVAILABLE</span><strong>${state.meters.treasury}<small>/ 100</small></strong></div><div><span>OUTSTANDING DEBT</span><strong>${state.debt}<small>units</small></strong></div></div><h3 class="history-heading">Your decisions, on the record.</h3><ol class="history-list">${state.history.map(report => `<li><span class="history-number">${report.turn.toString().padStart(2, '0')}</span><div><strong>${escape(report.eventTitle)}</strong><p>${escape(report.responseTitle)} <span aria-hidden="true">+</span> ${escape(report.policyTitle)}</p><span>Treasury ${report.meters.treasury} <span aria-hidden="true">·</span> Approval ${report.meters.approval} <span aria-hidden="true">·</span> Budget ${signed(report.budget.total)}</span></div></li>`).join('')}</ol><div class="panel-bottom"><p>Try another set of tradeoffs.</p><button class="button button-primary" type="button" data-action="restart" data-focus-key="restart-result">Restart scenario <span aria-hidden="true">↻</span></button></div></section>`;
}

function obligationList(effects, newIds = new Set()) {
  if (!effects.length) return '<p class="empty-obligations">No scheduled commitments. Debt interest, if any, continues separately.</p>';
  return `<ul class="obligation-list">${effects.map(effect => `<li><span class="obligation-date">${effect.dueTurn === state.turn && ['event', 'policy'].includes(state.phase) ? 'DUE NOW' : `TURN ${effect.dueTurn}`}</span><div><strong>${escape(effect.source)}</strong><span>${signed(effect.amount)} ${meterFor(effect.meter).label}${newIds.has(effect.id) ? ' · New commitment' : ''}${effect.dueTurn > TOTAL_TURNS ? ' · Beyond this scenario' : ''}</span></div></li>`).join('')}</ul>`;
}

function budgetSidebar(preview) {
  const isResult = state.phase === 'result';
  const isReport = state.phase === 'report';
  const report = isReport ? state.history.at(-1) : null;
  const baseline = !preview && !report ? forecastBudget(state, isResult ? state.turn + 1 : state.turn) : null;
  const budget = preview?.budget || report?.budget || baseline.budget;
  const projectedTreasury = preview?.meters.treasury ?? report?.meters.treasury ?? (isResult ? baseline.treasury : null);
  const obligations = preview ? [...state.scheduledEffects, ...preview.newScheduled].sort((a, b) => a.dueTurn - b.dueTurn) : state.scheduledEffects;
  const newIds = new Set(preview?.newScheduled.map(effect => effect.id) || []);
  return `<aside class="sidebar" aria-label="Budget and upcoming consequences"><section class="ledger"><div class="ledger-header"><span class="eyebrow">THE PUBLIC PURSE</span>${icon('vault')}<h3>${isResult ? 'Next budget' : isReport ? 'Settled budget' : preview ? 'Projected budget' : 'Budget baseline'}</h3><p>${isResult ? 'Next budget, before new decisions or events.' : isReport ? `Turn ${state.turn} · All costs included` : preview ? 'Your selected choices are included.' : 'Before this turn’s decisions.'}</p></div><dl class="budget-lines"><div><dt>Tax revenue <small>Economy ${preview?.meters.economy ?? report?.meters.economy ?? baseline.economy}</small></dt><dd>+${budget.revenue}</dd></div><div><dt>Essential spending</dt><dd>−${budget.spending}</dd></div><div><dt>Debt interest <small>Debt ${preview?.debt ?? state.debt}</small></dt><dd>${budget.interest ? `−${budget.interest}` : '0'}</dd></div><div><dt>Scheduled payments</dt><dd>${budget.commitments ? `−${budget.commitments}` : '0'}</dd></div></dl><div class="budget-total"><span>Budget change</span><strong data-budget-total class="${budget.total < 0 ? 'budget-negative' : ''}">${signed(budget.total)}</strong></div><p class="budget-explanation">${budget.total < 0 ? 'Your obligations exceed this turn’s revenue.' : budget.total > 0 ? 'Revenue exceeds your current obligations.' : 'Revenue covers your current obligations.'}</p><div class="treasury-forecast"><span>${isReport ? 'Treasury after settlement' : isResult ? 'Treasury after next budget' : 'Treasury after resolution'}</span><strong data-treasury-forecast>${projectedTreasury ?? '—'}</strong><small>${!preview && !report && !isResult ? 'Choose a policy for a complete forecast.' : projectedTreasury < 20 ? projectedTreasury === 0 ? 'CRISIS · Funds exhausted' : 'LOW · Little room for another shock' : 'Available fiscal capacity'}</small></div>${preview ? `<p class="ledger-footnote">Funds: ${state.meters.treasury} + choices ${signed(preview.meters.treasury === preview.rawMeters.treasury ? preview.rawMeters.treasury - state.meters.treasury - budget.total : preview.contributions.treasury.filter(effect => effect.type === 'event' || effect.type === 'policy').reduce((sum, effect) => sum + effect.amount, 0))} + budget ${signed(budget.total)}${preview.rawMeters.treasury < 0 ? ` = ${preview.rawMeters.treasury} before the zero floor.` : '.'}</p>` : ''}</section><section class="obligations"><div class="obligations-heading">${icon('clock')}<h3>Upcoming consequences</h3></div>${obligationList(obligations, newIds)}${(preview?.debt ?? state.debt) > 0 ? `<div class="ongoing-interest">${icon('document')}<span>Debt interest continues at <strong>${Math.ceil((preview?.debt ?? state.debt) * 0.05)} per turn</strong> until debt changes.</span></div>` : ''}</section><p class="sidebar-note">${icon('shield')} Survival means keeping every meter above zero.</p></aside>`;
}

function render({ focusHeading = false } = {}) {
  const focusKey = document.activeElement?.dataset.focusKey;
  const preview = state.phase === 'policy' && state.selectedPolicyId ? calculateTurn(state) : null;
  const panels = { event: eventPanel, policy: () => policyPanel(preview), report: reportPanel, result: resultPanel };
  app.innerHTML = `${renderMeters()}${renderProgress()}<div class="game-layout">${panels[state.phase]()}${budgetSidebar(preview)}</div>`;
  if (focusHeading) document.getElementById('phase-heading').focus({ preventScroll: true });
  else if (focusKey) document.querySelector(`[data-focus-key="${focusKey}"]`)?.focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  let focusHeading = false;
  try {
    switch (button.dataset.action) {
      case 'response':
        state = selectResponse(state, button.dataset.id);
        announcer.textContent = `${getEvent(state).responses.find(choice => choice.id === state.selectedResponseId).title} selected.`;
        break;
      case 'begin-policy':
        state = beginPolicyPhase(state); focusHeading = true;
        announcer.textContent = 'Event response locked. Choose a policy to see the complete forecast.';
        break;
      case 'policy': {
        state = selectPolicy(state, button.dataset.id);
        const preview = calculateTurn(state);
        announcer.textContent = `${preview.policyTitle} selected. Projected Treasury ${preview.meters.treasury}, debt ${preview.debt}.${preview.failures.length ? ` Warning: ${preview.failures.map(failure => failure.label).join(', ')} reaches zero.` : ''}`;
        break;
      }
      case 'resolve':
        state = resolveTurn(state); focusHeading = true;
        announcer.textContent = state.outcome === 'collapsed' ? failureDescription(state.history.at(-1)) : `Turn ${state.turn} resolved. Treasury ${state.meters.treasury}, Approval ${state.meters.approval}.`;
        break;
      case 'advance':
        state = advanceTurn(state); focusHeading = true;
        announcer.textContent = state.phase === 'result' ? `Scenario ${state.outcome}.` : `Turn ${state.turn}. A new event requires your response.`;
        break;
      case 'restart':
        state = createInitialState(); focusHeading = true;
        announcer.textContent = 'Scenario restarted. Treasury 24, debt zero. Turn one.';
        break;
      default: return;
    }
    render({ focusHeading });
    if (focusHeading) document.querySelector('.turn-bar').scrollIntoView({ block: 'start', behavior: 'instant' });
  } catch (error) {
    announcer.textContent = error.message;
  }
});

render();
