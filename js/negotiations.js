import { assessBill } from './legislation.js';
import { BILL_AMENDMENTS } from './negotiation-content.js';

export const MAX_PROPOSAL_AMENDMENTS = 2;
const maxHistory = Object.values(BILL_AMENDMENTS).reduce((total, provisions) => total + Object.keys(provisions).length * 2, 0);

function filedRecord(state, billId) {
  const record = state.assembly.legislativeRecords.find(item => item.billId === billId);
  if (record?.submittedTurn == null) throw new Error('File this bill with the Assembly before negotiating.');
  return record;
}

function activeAmendments(state, billId) {
  const active = new Set();
  for (const event of state.assembly.negotiationHistory) {
    if (event.billId !== billId) continue;
    if (event.kind === 'adopt') active.add(event.amendmentId);
    else active.delete(event.amendmentId);
  }
  return Object.values(BILL_AMENDMENTS[billId]).filter(amendment => active.has(amendment.id));
}

export function negotiationRelationship(state, partyId) {
  const commitments = new Map();
  for (const { billId, amendmentId, kind, turn } of state.assembly.negotiationHistory) {
    if (BILL_AMENDMENTS[billId]?.[partyId]?.id !== amendmentId) continue;
    const key = `${billId}/${amendmentId}`;
    if (kind === 'adopt') commitments.set(key, { accepted: turn, withdrawn: null });
    else commitments.get(key).withdrawn = turn;
  }
  // An agreement kept into a later turn earns trust once. Breaking it costs trust immediately.
  let trust = 0;
  for (const { accepted, withdrawn } of commitments.values()) {
    if ((withdrawn ?? state.turn) > accepted) trust++;
    if (withdrawn !== null) trust -= 2;
  }
  const label = trust >= 2 ? 'Cooperative' : trust >= 0 ? 'Professional'
    : trust === -1 ? 'Skeptical' : trust >= -3 ? 'Strained' : 'Hostile';
  return { trust, label };
}

function amendedTimeline(scope, amendments) {
  const effectsByTurn = new Map();
  const add = (turn, effects) => {
    const amounts = effectsByTurn.get(turn) ?? {};
    for (const [meter, amount] of Object.entries(effects)) {
      amounts[meter] = (amounts[meter] ?? 0) + amount;
      if (amounts[meter] === 0) delete amounts[meter];
    }
    effectsByTurn.set(turn, amounts);
  };
  add(0, scope.immediate);
  for (const step of scope.later) add(step.afterTurns, step.effects);
  for (const amendment of amendments) {
    add(0, amendment.immediate ?? {});
    for (const step of amendment.later ?? []) add(step.afterTurns, step.effects);
  }
  const delay = amendments.reduce((sum, amendment) => sum + (amendment.delay ?? 0), 0);
  const sunset = Math.min(Infinity, ...amendments.map(amendment => amendment.sunsetAfter ?? Infinity));
  const timeline = [...effectsByTurn].sort(([left], [right]) => left - right)
    .filter(([turn, effects]) => turn <= sunset && Object.keys(effects).length)
    .map(([turn, effects]) => ({ afterTurns: turn + delay, effects }));
  return {
    immediate: timeline.find(step => step.afterTurns === 0)?.effects ?? {},
    later: timeline.filter(step => step.afterTurns > 0)
  };
}

function forecastProposal(state, record, amendments) {
  const base = assessBill(state, record.billId, record.scopeId);
  const timeline = amendedTimeline(base.scope, amendments);
  const cost = Math.max(0, -(base.scope.immediate.treasury ?? 0));
  const partySupport = state.assembly.parties.map(party => {
    const backsScope = base.scope.backers.includes(party.id);
    const governing = party.id === state.assembly.presidentialPartyId;
    const baseSeats = governing
      ? backsScope ? party.seats - 3 - Math.ceil(cost / 5) : Math.floor(party.seats * 0.35)
      : backsScope ? Math.floor(party.seats * 0.72) : 0;
    const adjustment = amendments.reduce((seats, amendment) => seats + (amendment.support[party.id] ?? 0), 0);
    return { party, likelySeats: Math.max(0, Math.min(party.seats, baseSeats + adjustment)) };
  });
  return {
    ...base,
    scope: { ...base.scope, ...timeline },
    backers: partySupport.filter(bloc => bloc.likelySeats > 0).map(bloc => bloc.party),
    partySupport,
    amendments,
    likelySeats: partySupport.reduce((total, bloc) => total + bloc.likelySeats, 0),
    treasuryIfEnacted: state.meters.treasury + (timeline.immediate.treasury ?? 0)
  };
}

export function assessProposal(state, billId) {
  return forecastProposal(state, filedRecord(state, billId), activeAmendments(state, billId));
}

export function assessNegotiation(state, billId, partyId) {
  const record = filedRecord(state, billId);
  const amendment = BILL_AMENDMENTS[billId]?.[partyId];
  if (!amendment) throw new Error('This leader has no amendment for the proposal.');
  const amendments = activeAmendments(state, billId);
  const active = amendments.includes(amendment);
  const relationship = negotiationRelationship(state, partyId);
  let reason = '';
  if (state.outcome) reason = 'This term has ended. The proposal is on the record.';
  else if (!active) {
    if (state.assembly.negotiationHistory.some(event => event.billId === billId && event.amendmentId === amendment.id)) {
      reason = 'I’ve already withdrawn my offer for this bill. We can discuss a different proposal.';
    } else if (amendments.length >= MAX_PROPOSAL_AMENDMENTS) {
      reason = 'The bill already has two major amendments. A provision would have to be withdrawn before we could add another.';
    } else if (relationship.trust < (amendment.minimumTrust ?? -3)) {
      reason = 'I need a stronger record of kept commitments before I can offer these terms.';
    }
  }
  const revised = active ? amendments.filter(item => item !== amendment) : [...amendments, amendment];
  return {
    amendment, active, reason, relationship,
    current: forecastProposal(state, record, amendments),
    preview: reason ? null : forecastProposal(state, record, revised)
  };
}

export function recommendMeeting(state, billId, excludePartyId) {
  return Object.keys(BILL_AMENDMENTS[billId]).filter(partyId => partyId !== excludePartyId)
    .map(partyId => ({ partyId, ...assessNegotiation(state, billId, partyId) }))
    .filter(offer => !offer.active && offer.preview?.likelySeats > offer.current.likelySeats)
    .sort((left, right) => right.preview.likelySeats - left.preview.likelySeats)[0];
}

export function changeAmendment(state, billId, amendmentId, kind) {
  if (state.mode !== 'term' || state.outcome) throw new Error('Amendments require an active full term.');
  const record = filedRecord(state, billId);
  if (state.turn < record.submittedTurn) throw new Error('An amendment cannot predate its proposal.');
  const sponsor = Object.entries(BILL_AMENDMENTS[billId]).find(([, amendment]) => amendment.id === amendmentId)?.[0];
  if (!sponsor || !['adopt', 'withdraw'].includes(kind)) throw new Error('Choose a valid amendment action.');
  const offer = assessNegotiation(state, billId, sponsor);
  if (offer.reason) throw new Error(offer.reason);
  if (kind === 'adopt' && offer.active) throw new Error('This provision is already in the bill.');
  if (kind === 'withdraw' && !offer.active) throw new Error('This provision is not in the bill.');
  const negotiationHistory = [...state.assembly.negotiationHistory, { billId, amendmentId, kind, turn: state.turn }];
  return { ...state, assembly: { ...state.assembly, negotiationHistory } };
}

export function restoreNegotiationHistory(state, history) {
  if (!Array.isArray(history) || history.length > maxHistory) throw new Error('Invalid negotiation history.');
  // Replay against the filed proposals. Actions on the final turn may precede the term outcome.
  let replay = { ...state, turn: 1, outcome: null, assembly: { ...state.assembly, negotiationHistory: [] } };
  for (const { billId, amendmentId, kind, turn } of history) {
    if (!Number.isInteger(turn) || turn < replay.turn || turn > state.turn) throw new Error('Invalid amendment date.');
    replay = changeAmendment({ ...replay, turn }, billId, amendmentId, kind);
  }
  return replay.assembly.negotiationHistory;
}
