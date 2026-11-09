import { METERS } from './content.js';
import { BILLS, BILL_SCOPES, assessBill } from './legislation.js';
import { MAX_PROPOSAL_AMENDMENTS, assessProposal } from './negotiations.js';

const statusFor = record => record?.submittedTurn != null ? 'Proposed' : record ? 'Drafted' : 'Available';

function effectChips(effects) {
  return METERS.filter(meter => effects[meter.id]).map(({ id, short }) => {
    const amount = effects[id];
    return `<li class="${amount < 0 ? 'agenda-effect-loss' : ''}">${short} ${amount > 0 ? '+' : '−'}${Math.abs(amount)}</li>`;
  }).join('');
}

export function billTimelineMarkup(scope) {
  const changes = effectChips(scope.immediate);
  return `<dl class="agenda-effects">
    <div><dt>At enactment</dt><dd>${changes ? `<ul>${changes}</ul>` : 'No immediate changes'}</dd></div>
    ${scope.later.map(({ afterTurns, effects }) =>
      `<div><dt>${afterTurns === 1 ? '1 turn later' : `${afterTurns} turns later`}</dt><dd><ul>${effectChips(effects)}</ul></dd></div>`).join('')}
  </dl>`;
}

export function legislativeAgendaMarkup(state, billId, scopeId, confirming) {
  const records = state.assembly.legislativeRecords;
  const record = records.find(item => item.billId === billId);
  const proposed = record?.submittedTurn != null;
  const savedScope = record?.scopeId === scopeId;
  const forecast = proposed ? assessProposal(state, billId) : assessBill(state, billId, scopeId);
  const { bill, scope, scopeLabel, backers, partySupport, amendments, likelySeats, majoritySeats, treasuryIfEnacted } = forecast;
  const seatsShort = majoritySeats - likelySeats;
  let filing;
  if (proposed) {
    filing = `<p class="agenda-filing"><strong>${scopeLabel} proposal filed on Turn ${record.submittedTurn}.</strong>
      Ask the Chief of Staff in the Government Corridor which leaders to meet.</p>`;
  } else if (state.outcome) {
    filing = '<p class="agenda-filing">This term has ended. The agenda is available for review.</p>';
  } else {
    const draftScope = BILL_SCOPES.find(option => option.id === record?.scopeId);
    const message = draftScope ? `Saved draft · ${draftScope.label} · Turn ${record.draftedTurn}.`
      : 'Save a draft to consult the Finance Secretary in the Cabinet Room.';
    const controls = confirming ? `<div class="agenda-confirm" role="group" aria-label="Confirm Assembly submission">
      <p>Submit the <strong>${scopeLabel.toLowerCase()}</strong> draft to the Assembly? Filing locks its scope and starts the proposal record.</p>
      <div class="agenda-actions">
        <button class="button button-secondary" type="button" data-agenda-action="cancel">Cancel</button>
        <button class="button button-primary" type="button" data-agenda-action="confirm">Confirm Submission</button>
      </div>
    </div>`
    : `<div class="agenda-actions">
      <button class="button button-secondary" type="button" data-agenda-action="save" ${savedScope ? 'disabled' : ''}>${record ? 'Update Draft' : 'Save Draft'}</button>
      <button class="button button-primary" type="button" data-agenda-action="submit" ${savedScope ? '' : 'disabled'}>Submit to Assembly</button>
    </div>`;
    filing = `<p class="agenda-filing">${message} ${record && !savedScope ? 'Save the new scope before submitting.' : ''}</p>${controls}`;
  }

  return `
    <div class="agenda-layout">
      <section class="agenda-catalog" aria-labelledby="agenda-catalog-title">
        <h4 id="agenda-catalog-title">Bill catalog</h4>
        <p>Select a proposal to examine its effects and legislative requirements.</p>
        <div class="agenda-bills" role="group" aria-label="Legislative bills">
          ${BILLS.map(item => {
            const status = statusFor(records.find(entry => entry.billId === item.id));
            return `<button type="button" class="agenda-bill" data-agenda-bill="${item.id}" aria-pressed="${item.id === billId}">
              <span class="agenda-bill-category">${item.category}</span>
              <strong>${item.title}</strong>
              <span class="agenda-status" data-status="${status}">${status}</span>
            </button>`;
          }).join('')}
        </div>
      </section>
      <article class="agenda-detail" aria-labelledby="agenda-bill-title">
        <button class="button button-secondary agenda-catalog-back" type="button" data-agenda-action="catalog">Back to bill catalog</button>
        <p class="assembly-label">${bill.category} · ${statusFor(record)}</p>
        <h4 id="agenda-bill-title" tabindex="-1">${bill.title}</h4>
        <p>${bill.description}</p>
        <div class="agenda-scopes" role="group" aria-label="Bill scope">
          ${BILL_SCOPES.map(option => `<button type="button" class="button button-secondary"
            data-agenda-scope="${option.id}" aria-pressed="${scopeId === option.id}" ${proposed ? 'disabled' : ''}>${option.label}</button>`).join('')}
        </div>
        <p>${scope.brief}</p>

        <section class="agenda-assessment" aria-labelledby="agenda-finance-title">
          <h5 id="agenda-finance-title">Cabinet assessment</h5>
          <p>Projected changes if enacted. Delays are measured from enactment.</p>
          ${billTimelineMarkup(scope)}
          <p><strong>Treasury after upfront effects</strong> ${state.meters.treasury} → ${treasuryIfEnacted}
            <small>before turn costs and meter limits</small></p>
          ${treasuryIfEnacted <= 0 ? '<p class="agenda-budget-warning">Current funds cannot cover this scope while keeping Treasury above zero.</p>' : ''}
        </section>

        <section class="agenda-assessment" aria-labelledby="agenda-support-title">
          <h5 id="agenda-support-title">${proposed ? 'Estimated Assembly support' : 'Preliminary party outlook'}</h5>
          <p><strong>${likelySeats} ${proposed ? 'likely seats' : 'seats held by favorable parties'}</strong> · ${majoritySeats} needed for a majority
            ${proposed && seatsShort > 0 ? `· ${seatsShort} short` : ''}</p>
          ${proposed ? `<ul class="agenda-provisions">${partySupport.map(({ party, likelySeats }) =>
            `<li>${party.name} · ${likelySeats} of ${party.seats} likely</li>`).join('')}</ul>`
            : `<p>${backers.map(party => party.name).join(' · ')}</p><p>Leaders estimate individual support after filing.</p>`}
        </section>

        ${proposed ? `<section class="agenda-assessment" aria-label="Agreed amendments">
          <h5>Agreed amendments · ${amendments.length} of ${MAX_PROPOSAL_AMENDMENTS}</h5>
          ${amendments.length ? `<ul class="agenda-provisions">${amendments.map(amendment =>
            `<li>${amendment.title} · ${amendment.type}</li>`).join('')}</ul>` : '<p>The filed text has no amendments yet.</p>'}
        </section>` : ''}
        ${filing}
      </article>
    </div>`;
}
