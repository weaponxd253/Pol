import { BILLS } from './legislation.js';
import { billTimelineMarkup } from './legislative-agenda.js';
import { NEGOTIATORS } from './negotiation-content.js';
import { assessNegotiation, negotiationRelationship, recommendMeeting } from './negotiations.js';

function line(speaker, text) {
  return `<div class="negotiation-line" tabindex="-1"><strong>${speaker}</strong><p>${text}</p></div>`;
}

function caucusReading(party, forecast, presidentialPartyId) {
  const { likelySeats } = forecast.partySupport.find(bloc => bloc.party.id === party.id);
  if (party.id !== presidentialPartyId) {
    return `On this version I count ${likelySeats} of our ${party.seats} members as likely backers. Each member will have to decide where they stand.`;
  }
  const defections = party.seats - likelySeats;
  const pressure = !forecast.scope.backers.includes(party.id)
    ? 'Members with major donors in their districts are wary of the tighter rules.'
    : (forecast.scope.immediate.treasury ?? 0) <= -10
      ? 'Our budget hawks are wary of the upfront appropriation.'
      : 'Members on the fence want to see how the details land in their districts.';
  return `I count ${likelySeats} likely backers from our ${party.seats} seats, with ${defections} possible defections. ${pressure}`;
}

export function negotiationDialogueMarkup(state, partyId, billId, stage) {
  const leader = NEGOTIATORS[partyId];
  const party = state.assembly.parties.find(item => item.id === partyId);
  const relationship = negotiationRelationship(state, partyId);
  const proposals = state.assembly.legislativeRecords.filter(record => record.submittedTurn !== null);
  const header = `<p class="negotiation-party"><strong>${party.name}</strong><span>${relationship.label}</span></p>
    <p class="negotiation-priorities">${party.priorities.join(' · ')}</p>`;

  if (!billId) {
    const greeting = state.outcome ? 'The term has ended. Any filed proposals are available for review.'
      : proposals.length ? leader.greeting : 'File a proposal at the National Policy Desk and we can discuss the text.';
    return header + line(leader.role, greeting) +
      `<div class="negotiation-bills" role="group" aria-label="Filed proposals">
        ${proposals.map(({ billId }) => {
          const bill = BILLS.find(item => item.id === billId);
          return `<button class="button button-secondary" type="button" data-meeting-bill="${billId}">${bill.title}</button>`;
        }).join('')}
      </div>`;
  }

  const { amendment, active, reason, current, preview } = assessNegotiation(state, billId, partyId);
  const overview = `${current.likelySeats} likely seats across the Assembly, with ${current.majoritySeats} needed for a majority.`;
  const back = '<button class="button button-secondary" type="button" data-meeting-action="bills">Discuss another bill</button>';
  const reading = caucusReading(party, current, state.assembly.presidentialPartyId);
  let dialogue = line('President', `Let’s discuss the ${current.bill.title}.`) + line(leader.role, `${reading} ${overview}`);

  if (stage === 'terms' && !reason) {
    const currentSeats = current.partySupport.find(bloc => bloc.party.id === partyId).likelySeats;
    const revisedSeats = preview.partySupport.find(bloc => bloc.party.id === partyId).likelySeats;
    const exchange = active
      ? line('President', `I’m considering withdrawing the ${amendment.title}.`) +
        line(leader.role, 'That provision was our agreement. Withdraw it and this offer is closed for the bill. I’ll remember it when we next negotiate.')
      : line('President', 'What would it take to earn more support?') + line(leader.role, amendment.request);
    return header + `<p class="negotiation-bill-title">${current.bill.title}</p>` + exchange + `
      <section class="negotiation-forecast" aria-label="Revised proposal forecast">
        <h4>${active ? 'Withdraw' : 'Add'} ${amendment.title}</h4>
        <p>${amendment.type} · ${party.name} support ${currentSeats} → ${revisedSeats}</p>
        <p><strong>Assembly estimate ${current.likelySeats} → ${preview.likelySeats}</strong> · ${current.majoritySeats} needed for a majority</p>
        <p><strong>Revised effects if enacted</strong> · Treasury after upfront effects ${current.treasuryIfEnacted} → ${preview.treasuryIfEnacted}</p>
        ${billTimelineMarkup(preview.scope)}
      </section>
      <div class="negotiation-actions">
        <button class="button button-secondary" type="button" data-meeting-action="position">${active ? 'Keep the provision' : 'Decline the offer'}</button>
        <button class="button button-primary" type="button" data-meeting-action="${active ? 'withdraw' : 'adopt'}">${active ? 'Confirm Withdrawal' : 'Agree and Amend'}</button>
      </div>`;
  }

  if (reason) dialogue += line(leader.role, reason);
  else if (active) dialogue += line(leader.role, `The ${amendment.title} is in the filed text. My caucus will consider the bill with that provision in place.`);
  if (!state.outcome && partyId === state.assembly.presidentialPartyId && current.likelySeats < current.majoritySeats) {
    const meeting = recommendMeeting(state, billId, partyId);
    if (meeting) {
      const contact = NEGOTIATORS[meeting.partyId];
      dialogue += line(leader.role, `For more votes, I’d start with ${contact.name} in the ${contact.location}. Ask about the ${meeting.amendment.title}.`);
    }
  }
  const ask = reason ? '' : `<button class="button button-secondary" type="button" data-meeting-action="terms">${active ? 'Discuss withdrawing the provision' : 'Ask what would earn more support'}</button>`;
  return header + dialogue + `<div class="negotiation-actions">${ask}${back}</div>`;
}
