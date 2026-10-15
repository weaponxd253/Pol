import { METERS, getScenario, CONTENT_VERSION, RULES_VERSION } from './content.js';

const bound = value => Math.max(0, Math.min(100, value));
const requirePhase = (state, phase) => {
  if (state.phase !== phase) throw new Error('This action requires the ' + phase + ' phase.');
};

function seededGenerator(seed) {
  let value = 2166136261;
  for (const character of seed) value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0;
  return {
    next() {
      value = (value + 0x6D2B79F5) >>> 0;
      let mixed = Math.imul(value ^ value >>> 15, value | 1);
      mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
      return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
    },
    state: () => value,
  };
}
function shuffled(items, generator) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const index = Math.floor(generator.next() * (i + 1));
    [result[i], result[index]] = [result[index], result[i]];
  }
  return result;
}
export function capConditionModifiers(entries) {
  const result = entries.map(entry => ({ ...entry }));
  for (const meter of METERS) {
    const total = entries.filter(entry => entry.meter === meter.id).reduce((sum, entry) => sum + entry.amount, 0);
    const correction = Math.max(-4, Math.min(4, total)) - total;
    if (correction) result.push({ meter: meter.id, amount: correction, source: 'Nation condition limit (±4)', sourceId: 'condition-cap', type: 'condition-cap' });
  }
  return result;
}

function revealEvent(state, id, reviewSource = null) {
  const scenario = getScenario(state.mode);
  const event = [...scenario.events, ...scenario.reviews].find(item => item.id === id);
  if (!event) throw new Error('This turn does not have an event.');
  return {
    ...structuredClone(event), origin: reviewSource ? 'review' : 'base', reviewSource: structuredClone(reviewSource),
    responses: event.responses.map(response => {
      const breakdown = Object.entries(response.effects).map(([meter, amount]) => ({ meter, amount, source: response.title, sourceId: event.id + '/' + response.id, sourceTurn: state.turn, type: 'event' }));
      const notes = [];
      if (response.debtRule) {
        const active = state.debt >= response.debtRule.threshold;
        if (active) breakdown.push({ meter: 'treasury', amount: response.debtRule.treasury, source: 'High-debt refinancing fee', sourceId: 'debt-rule', sourceTurn: state.turn, type: 'threshold' });
        notes.push('Debt of ' + response.debtRule.threshold + ' or more adds a ' + -response.debtRule.treasury + ' Treasury refinancing fee. ' + (active ? 'Applies: your debt is ' : 'No fee: your debt is ') + state.debt + '.');
      }
      for (const rule of response.conditions || []) {
        const value = rule.metric === 'debt' ? state.debt : state.meters[rule.metric];
        const active = rule.comparison === 'gte' ? value >= rule.threshold : value < rule.threshold;
        if (active) for (const [meter, amount] of Object.entries(rule.effects)) breakdown.push({ meter, amount, source: rule.description, sourceId: rule.metric + '-threshold', sourceTurn: state.turn, type: 'threshold' });
        notes.push(rule.description + ' ' + (active ? 'Applies' : 'Not active') + ': ' + (rule.metric === 'debt' ? 'debt' : 'Stability') + ' is ' + value + '.');
      }
      const conditionEntries = [];
      for (const instance of state.nationConditions) {
        if (instance.startTurn > state.turn || instance.lastTurn < state.turn) continue;
        const definition = scenario.nationConditions.find(item => item.id === instance.conditionId);
        for (const modifier of definition.modifiers.filter(item => item.eventId === id && item.responseId === response.id)) {
          for (const [meter, amount] of Object.entries(modifier.effects)) {
            conditionEntries.push({ meter, amount, type: 'nation', conditionId: definition.id, sourceId: instance.id, sourceTurn: instance.sourceTurn,
              source: definition.title + ' from ' + instance.source + ' (turn ' + instance.sourceTurn + ')' });
            const label = METERS.find(item => item.id === meter).label;
            notes.push(definition.title + ' enacted on turn ' + instance.sourceTurn + ': ' + label + ' ' + (amount > 0 ? '+' : '−') + Math.abs(amount) + ' on this response.');
          }
        }
      }
      const capped = capConditionModifiers(conditionEntries);
      breakdown.push(...capped);
      if (capped.some(item => item.type === 'condition-cap')) notes.push('Combined nation-condition adjustments are limited to ±4 per meter.');
      const effects = {};
      for (const entry of breakdown) effects[entry.meter] = (effects[entry.meter] || 0) + entry.amount;
      return { ...structuredClone(response), effects, effectBreakdown: breakdown, condition: notes.length ? notes.join(' ') : null };
    }),
  };
}
export function createInitialState({ mode = 'quick', seed = 'ARDEN' } = {}) {
  const scenario = getScenario(mode);
  const normalizedSeed = String(seed).trim().slice(0, 64);
  if (!normalizedSeed) throw new Error('A run needs a seed.');
  const generator = seededGenerator(normalizedSeed);
  const eventIds = scenario.events.map(event => event.id);
  const policyIds = scenario.policies.map(policy => policy.id);
  const eventDeck = mode === 'term' ? shuffled(eventIds, generator) : [...eventIds];
  const policyDeck = mode === 'term' ? shuffled(policyIds, generator) : [];
  let hand = [...policyIds];
  if (mode === 'term') {
    const take = predicate => policyDeck.splice(policyDeck.findIndex(id => predicate(scenario.policies.find(policy => policy.id === id))), 1)[0];
    const funds = take(policy => (policy.effects.treasury || 0) > 0);
    const support = take(policy => (policy.effects.approval || 0) > 0 || (policy.effects.stability || 0) > 0);
    hand = [funds, support, ...policyDeck.splice(0, 2)];
  }
  const state = {
    mode, seed: normalizedSeed, rngState: generator.state(), rulesVersion: RULES_VERSION, contentVersion: CONTENT_VERSION,
    turn: 1, phase: 'event',
    meters: { approval: 60, treasury: scenario.treasury, donors: 60, economy: 60, international: 60, stability: 60 },
    debt: 0, selectedResponseId: null, selectedPolicyId: null,
    eventDeck, currentEvent: null, policyDeck, hand,
    usedPolicyIds: [], scheduledEffects: [], nationConditions: [], reviewReservations: [], history: [], outcome: null,
  };
  state.currentEvent = revealEvent(state, state.eventDeck.shift());
  return state;
}
export const getEvent = state => structuredClone(state.currentEvent);
export const getPolicies = state => getScenario(state.mode).policies;
export function policyConsequences(state, policy) {
  const scenario = getScenario(state.mode);
  const definition = scenario.nationConditions.find(item => item.id === policy.nationConditionId);
  const newConditions = definition ? [{ id: 'condition:' + definition.id + ':' + state.turn, conditionId: definition.id,
    sourceId: policy.id, source: policy.title, sourceTurn: state.turn, startTurn: state.turn + 1, lastTurn: state.turn + definition.duration }] : [];
  const newReviews = [];
  if (policy.review) {
    const requestedTurn = state.turn + policy.review.offset;
    let reservedTurn = requestedTurn;
    while (state.reviewReservations.some(review => review.reservedTurn === reservedTurn)) reservedTurn++;
    const review = scenario.reviews.find(item => item.id === policy.review.reviewId);
    newReviews.push({ id: 'review:' + review.id + ':' + state.turn, reviewId: review.id, title: review.title,
      sourceId: policy.id, source: policy.title, sourceTurn: state.turn, requestedTurn, reservedTurn });
  }
  return { newConditions, newReviews };
}
export function policyDetails(state, policy) {
  const repayment = Math.min(state.debt, policy.repayDebt || 0);
  const effects = { ...policy.effects };
  if (policy.repayDebt) effects.treasury = (effects.treasury || 0) - repayment;
  const reason = state.usedPolicyIds.includes(policy.id) ? 'Already used' : !state.hand.includes(policy.id) ? 'Not in your hand' : policy.repayDebt && !state.debt ? 'Requires outstanding debt' : null;
  const consequences = policyConsequences(state, policy);
  const notes = consequences.newConditions.map(instance => {
    const condition = getScenario(state.mode).nationConditions.find(item => item.id === instance.conditionId);
    const unseen = condition.modifiers.some(modifier => state.eventDeck.includes(modifier.eventId));
    return condition.title + ' on turns ' + instance.startTurn + '–' + instance.lastTurn + '. ' + condition.description + (!unseen ? ' Its relevant base events have already appeared this term.' : ' Applies only if a relevant event occurs while active.');
  });
  for (const review of consequences.newReviews) notes.push(review.title + ' scheduled on turn ' + review.reservedTurn + (review.reservedTurn !== review.requestedTurn ? ' (turn ' + review.requestedTurn + ' is already reserved)' : '') + '. Choose a response then; no extra payment is assumed.');
  return {
    ...policy, effects, debtChange: policy.debt || -repayment || 0, disabledReason: reason,
    ...consequences,
    consequence: (policy.repayDebt ? repayment ? 'Repay ' + repayment + ' debt for ' + repayment + ' Treasury. Interest this turn: ' + Math.ceil((state.debt - repayment) * 0.05) + ' (was ' + Math.ceil(state.debt * 0.05) + ').' : 'Requires outstanding debt. Repay up to 10 for the same amount of Treasury.' : policy.consequence) + (notes.length ? ' ' + notes.join(' ') : ''),
  };
}
export function selectResponse(state, responseId) {
  requirePhase(state, 'event');
  if (!state.currentEvent.responses.some(response => response.id === responseId)) throw new Error('Choose a response to the current event.');
  return { ...state, selectedResponseId: responseId };
}
export function beginPolicyPhase(state) {
  requirePhase(state, 'event');
  if (!state.currentEvent.responses.some(response => response.id === state.selectedResponseId)) throw new Error('Select an event response first.');
  return { ...state, phase: 'policy' };
}
function availablePolicy(state, id) {
  const definition = getPolicies(state).find(policy => policy.id === id);
  if (!definition) throw new Error('Choose an available policy.');
  const policy = policyDetails(state, definition);
  if (policy.disabledReason) throw new Error(policy.disabledReason);
  return policy;
}
export function selectPolicy(state, id) {
  requirePhase(state, 'policy');
  availablePolicy(state, id);
  return { ...state, selectedPolicyId: id };
}
function budgetFor(economy, debt, due) {
  const revenue = 8 + Math.floor(economy / 10);
  const spending = 14;
  const interest = Math.ceil(debt * 0.05);
  const commitments = due.filter(effect => effect.meter === 'treasury').reduce((sum, effect) => sum - effect.amount, 0);
  return { revenue, spending, interest, commitments, total: revenue - spending - interest - commitments };
}
export function forecastBudget(state, targetTurn = state.turn + 1) {
  const due = state.scheduledEffects.filter(effect => effect.dueTurn === targetTurn);
  const economy = bound(state.meters.economy + due.filter(effect => effect.meter === 'economy').reduce((sum, effect) => sum + effect.amount, 0));
  const budget = budgetFor(economy, state.debt, due);
  const rawTreasury = state.meters.treasury + budget.total;
  return { targetTurn, economy, budget, due, rawTreasury, treasury: bound(rawTreasury) };
}
export function evaluateOutcome(meters, mode, turn) {
  if (METERS.some(meter => meters[meter.id] === 0)) return 'collapsed';
  const scenario = getScenario(mode);
  if (turn < scenario.turns) return null;
  return mode === 'quick' ? 'survived' : meters.approval >= scenario.electionTarget ? 'reelected' : 'election-lost';
}
export function calculateTurn(state, responseId = state.selectedResponseId, policyId = state.selectedPolicyId) {
  requirePhase(state, 'policy');
  if (responseId !== state.selectedResponseId) throw new Error('The event response is already locked.');
  const event = getEvent(state);
  const response = event.responses.find(choice => choice.id === responseId);
  if (!response) throw new Error('Select a valid event response.');
  const policy = availablePolicy(state, policyId);
  const due = state.scheduledEffects.filter(effect => effect.dueTurn === state.turn);
  const contributions = Object.fromEntries(METERS.map(meter => [meter.id, []]));
  const add = (meter, amount, source, type) => { if (amount !== 0) contributions[meter].push({ amount, source, type }); };
  for (const { meter, ...entry } of response.effectBreakdown) if (entry.amount !== 0) contributions[meter].push({ ...entry });
  for (const [meter, amount] of Object.entries(policy.effects)) add(meter, amount, policy.title, 'policy');
  for (const effect of due) add(effect.meter, effect.amount, effect.source + ' (from turn ' + effect.sourceTurn + ')', 'scheduled');
  const rawMeters = { ...state.meters };
  const meters = { ...state.meters };
  for (const meter of METERS.filter(item => item.id !== 'treasury')) {
    rawMeters[meter.id] += contributions[meter.id].reduce((sum, effect) => sum + effect.amount, 0);
    meters[meter.id] = bound(rawMeters[meter.id]);
  }
  const debt = state.debt + policy.debtChange;
  const budget = budgetFor(meters.economy, debt, due);
  add('treasury', budget.revenue, 'Tax revenue', 'budget');
  add('treasury', -budget.spending, 'Essential spending', 'budget');
  add('treasury', -budget.interest, 'Debt interest', 'budget');
  rawMeters.treasury += contributions.treasury.reduce((sum, effect) => sum + effect.amount, 0);
  meters.treasury = bound(rawMeters.treasury);
  const schedule = (choice, sourceType, sourceId, source) => (choice.future || []).map((effect, index) => ({
    id: sourceType + ':' + sourceId + ':' + state.turn + ':' + index, sourceType, sourceId, source, sourceTurn: state.turn,
    dueTurn: state.turn + effect.offset, meter: effect.meter, amount: effect.amount,
  }));
  const newScheduled = [...schedule(response, 'response', event.id + '/' + response.id, event.title + ': ' + response.title), ...schedule(policy, 'policy', policy.id, policy.title)];
  const remainingScheduled = [...state.scheduledEffects.filter(effect => effect.dueTurn > state.turn).map(effect => ({ ...effect })), ...newScheduled].sort((a, b) => a.dueTurn - b.dueTurn);
  if (policy.newConditions.some(item => state.nationConditions.some(active => active.conditionId === item.conditionId))) throw new Error('This nation condition has already been created.');
  const remainingNationConditions = [...structuredClone(state.nationConditions), ...policy.newConditions];
  const remainingReviews = [...structuredClone(state.reviewReservations), ...policy.newReviews].sort((a, b) => a.reservedTurn - b.reservedTurn);
  const failures = METERS.filter(meter => meters[meter.id] === 0).map(meter => ({ ...meter, shortfall: Math.max(0, -rawMeters[meter.id]) }));
  return {
    turn: state.turn, eventId: event.id, eventTitle: event.title, eventOrigin: event.origin, reviewSource: structuredClone(event.reviewSource), responseId, responseTitle: response.title,
    policyId, policyTitle: policy.title, startMeters: { ...state.meters }, meters, rawMeters,
    startDebt: state.debt, debt, newDebt: policy.debtChange,
    contributions, budget, due: due.map(effect => ({ ...effect })), newScheduled, remainingScheduled,
    newConditions: policy.newConditions, remainingNationConditions, expiringConditions: state.nationConditions.filter(item => item.lastTurn === state.turn).map(item => ({ ...item })),
    newReviews: policy.newReviews, remainingReviews,
    conditionApplications: response.effectBreakdown.filter(item => item.type === 'nation').map(item => ({ ...item })),
    failures, outcome: evaluateOutcome(meters, state.mode, state.turn),
  };
}
export function resolveTurn(state) {
  const report = calculateTurn(state);
  const hand = state.hand.filter(id => id !== report.policyId);
  const policyDeck = [...state.policyDeck];
  if (state.mode === 'term' && !report.outcome && policyDeck.length) hand.push(policyDeck.shift());
  return {
    ...state, phase: 'report', meters: { ...report.meters }, debt: report.debt, hand, policyDeck,
    usedPolicyIds: [...state.usedPolicyIds, report.policyId], scheduledEffects: report.remainingScheduled.map(effect => ({ ...effect })),
    nationConditions: structuredClone(report.remainingNationConditions), reviewReservations: structuredClone(report.remainingReviews),
    history: [...state.history, report], outcome: report.outcome,
  };
}
export function advanceTurn(state) {
  requirePhase(state, 'report');
  if (state.outcome) return { ...state, phase: 'result' };
  const next = { ...state, turn: state.turn + 1, phase: 'event', selectedResponseId: null, selectedPolicyId: null, eventDeck: [...state.eventDeck],
    nationConditions: state.nationConditions.filter(item => item.lastTurn >= state.turn + 1).map(item => ({ ...item })), reviewReservations: structuredClone(state.reviewReservations) };
  const review = next.reviewReservations.find(item => item.reservedTurn === next.turn);
  if (review) next.reviewReservations = next.reviewReservations.filter(item => item.id !== review.id);
  next.currentEvent = revealEvent(next, review ? review.reviewId : next.eventDeck.shift(), review || null);
  return next;
}
