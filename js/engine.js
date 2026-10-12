import { EVENTS, METERS, POLICIES, TOTAL_TURNS } from './content.js';

const bound = value => Math.max(0, Math.min(100, value));
const requirePhase = (state, phase) => {
  if (state.phase !== phase) throw new Error(`This action requires the ${phase} phase.`);
};

export function createInitialState() {
  return {
    turn: 1, phase: 'event',
    meters: { approval: 60, treasury: 24, donors: 60, economy: 60, international: 60, stability: 60 },
    debt: 0, selectedResponseId: null, selectedPolicyId: null,
    usedPolicyIds: [], scheduledEffects: [], history: [], outcome: null,
  };
}

export function getEvent(state) {
  const event = EVENTS[state.turn - 1];
  if (!event) throw new Error('This turn does not have an event.');
  return {
    ...event,
    responses: event.responses.map(response => {
      const effects = { ...response.effects };
      const hasFee = response.debtRule && state.debt >= response.debtRule.threshold;
      if (hasFee) effects.treasury = (effects.treasury || 0) + response.debtRule.treasury;
      return {
        ...response, effects,
        condition: response.debtRule
          ? `Debt of ${response.debtRule.threshold} or more adds a 4 Treasury refinancing fee. ${hasFee ? `Applies: your debt is ${state.debt}.` : `No fee: your debt is ${state.debt}.`}`
          : null,
      };
    }),
  };
}

export function selectResponse(state, responseId) {
  requirePhase(state, 'event');
  if (!getEvent(state).responses.some(response => response.id === responseId)) throw new Error('Choose a response to the current event.');
  return { ...state, selectedResponseId: responseId };
}

export function beginPolicyPhase(state) {
  requirePhase(state, 'event');
  if (!getEvent(state).responses.some(response => response.id === state.selectedResponseId)) throw new Error('Select an event response first.');
  return { ...state, phase: 'policy' };
}

function availablePolicy(state, policyId) {
  const policy = POLICIES.find(card => card.id === policyId);
  if (!policy || state.usedPolicyIds.includes(policyId)) throw new Error('Choose an unused policy.');
  return policy;
}

export function selectPolicy(state, policyId) {
  requirePhase(state, 'policy');
  availablePolicy(state, policyId);
  return { ...state, selectedPolicyId: policyId };
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

export function calculateTurn(state, responseId = state.selectedResponseId, policyId = state.selectedPolicyId) {
  requirePhase(state, 'policy');
  if (responseId !== state.selectedResponseId) throw new Error('The event response is already locked.');
  const event = getEvent(state);
  const response = event.responses.find(choice => choice.id === responseId);
  if (!response) throw new Error('Select a valid event response.');
  const policy = availablePolicy(state, policyId);
  const due = state.scheduledEffects.filter(effect => effect.dueTurn === state.turn);
  const contributions = Object.fromEntries(METERS.map(meter => [meter.id, []]));
  const add = (meter, amount, source, type) => {
    if (amount !== 0) contributions[meter].push({ amount, source, type });
  };
  for (const [meter, amount] of Object.entries(response.effects)) add(meter, amount, response.title, 'event');
  for (const [meter, amount] of Object.entries(policy.effects)) add(meter, amount, policy.title, 'policy');
  for (const effect of due) add(effect.meter, effect.amount, effect.source, 'scheduled');

  const rawMeters = { ...state.meters };
  const meters = { ...state.meters };
  for (const meter of METERS.filter(item => item.id !== 'treasury')) {
    rawMeters[meter.id] += contributions[meter.id].reduce((sum, effect) => sum + effect.amount, 0);
    meters[meter.id] = bound(rawMeters[meter.id]);
  }
  const debt = state.debt + (policy.debt || 0);
  const budget = budgetFor(meters.economy, debt, due);
  add('treasury', budget.revenue, 'Tax revenue', 'budget');
  add('treasury', -budget.spending, 'Essential spending', 'budget');
  add('treasury', -budget.interest, 'Debt interest', 'budget');
  rawMeters.treasury += contributions.treasury.reduce((sum, effect) => sum + effect.amount, 0);
  meters.treasury = bound(rawMeters.treasury);

  const newScheduled = policy.future.map((effect, index) => ({
    id: `${policy.id}-${state.turn}-${index}`, sourceId: policy.id, source: policy.title,
    dueTurn: state.turn + effect.offset, meter: effect.meter, amount: effect.amount,
  }));
  const remainingScheduled = [
    ...state.scheduledEffects.filter(effect => effect.dueTurn > state.turn).map(effect => ({ ...effect })),
    ...newScheduled,
  ].sort((a, b) => a.dueTurn - b.dueTurn);
  const failures = METERS.filter(meter => meters[meter.id] === 0).map(meter => ({
    ...meter, shortfall: Math.max(0, -rawMeters[meter.id]),
  }));

  return {
    turn: state.turn, eventTitle: event.title, responseId, responseTitle: response.title,
    policyId, policyTitle: policy.title, startMeters: { ...state.meters }, meters, rawMeters,
    startDebt: state.debt, debt, newDebt: policy.debt || 0,
    contributions, budget, due: due.map(effect => ({ ...effect })), newScheduled, remainingScheduled,
    failures, outcome: failures.length ? 'collapsed' : state.turn === TOTAL_TURNS ? 'survived' : null,
  };
}

export function resolveTurn(state) {
  const report = calculateTurn(state);
  return {
    ...state, phase: 'report', meters: { ...report.meters }, debt: report.debt,
    usedPolicyIds: [...state.usedPolicyIds, report.policyId],
    scheduledEffects: report.remainingScheduled.map(effect => ({ ...effect })),
    history: [...state.history, report], outcome: report.outcome,
  };
}

export function advanceTurn(state) {
  requirePhase(state, 'report');
  if (state.outcome) return { ...state, phase: 'result' };
  if (state.turn >= TOTAL_TURNS) throw new Error('The scenario has ended.');
  return { ...state, turn: state.turn + 1, phase: 'event', selectedResponseId: null, selectedPolicyId: null };
}
