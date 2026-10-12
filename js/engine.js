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
function revealEvent(state, id) {
  const event = getScenario(state.mode).events.find(item => item.id === id);
  if (!event) throw new Error('This turn does not have an event.');
  return {
    ...structuredClone(event),
    responses: event.responses.map(response => {
      const effects = { ...response.effects };
      const notes = [];
      if (response.debtRule) {
        const active = state.debt >= response.debtRule.threshold;
        if (active) effects.treasury = (effects.treasury || 0) + response.debtRule.treasury;
        notes.push('Debt of ' + response.debtRule.threshold + ' or more adds a ' + -response.debtRule.treasury + ' Treasury refinancing fee. ' + (active ? 'Applies: your debt is ' : 'No fee: your debt is ') + state.debt + '.');
      }
      for (const rule of response.conditions || []) {
        const value = rule.metric === 'debt' ? state.debt : state.meters[rule.metric];
        const active = rule.comparison === 'gte' ? value >= rule.threshold : value < rule.threshold;
        if (active) for (const [meter, amount] of Object.entries(rule.effects)) effects[meter] = (effects[meter] || 0) + amount;
        notes.push(rule.description + ' ' + (active ? 'Applies' : 'Not active') + ': ' + (rule.metric === 'debt' ? 'debt' : 'Stability') + ' is ' + value + '.');
      }
      return { ...structuredClone(response), effects, condition: notes.length ? notes.join(' ') : null };
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
    usedPolicyIds: [], scheduledEffects: [], history: [], outcome: null,
  };
  state.currentEvent = revealEvent(state, state.eventDeck.shift());
  return state;
}
export const getEvent = state => structuredClone(state.currentEvent);
export const getPolicies = state => getScenario(state.mode).policies;
export function policyDetails(state, policy) {
  const repayment = Math.min(state.debt, policy.repayDebt || 0);
  const effects = { ...policy.effects };
  if (policy.repayDebt) effects.treasury = (effects.treasury || 0) - repayment;
  const reason = state.usedPolicyIds.includes(policy.id) ? 'Already used' : !state.hand.includes(policy.id) ? 'Not in your hand' : policy.repayDebt && !state.debt ? 'Requires outstanding debt' : null;
  return {
    ...policy, effects, debtChange: policy.debt || -repayment || 0, disabledReason: reason,
    consequence: policy.repayDebt ? repayment ? 'Repay ' + repayment + ' debt for ' + repayment + ' Treasury. Interest this turn: ' + Math.ceil((state.debt - repayment) * 0.05) + ' (was ' + Math.ceil(state.debt * 0.05) + ').' : 'Requires outstanding debt. Repay up to 10 for the same amount of Treasury.' : policy.consequence,
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
  for (const [meter, amount] of Object.entries(response.effects)) add(meter, amount, response.title, 'event');
  for (const [meter, amount] of Object.entries(policy.effects)) add(meter, amount, policy.title, 'policy');
  for (const effect of due) add(effect.meter, effect.amount, effect.source, 'scheduled');
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
  const newScheduled = policy.future.map((effect, index) => ({
    id: policy.id + '-' + state.turn + '-' + index, sourceId: policy.id, source: policy.title,
    dueTurn: state.turn + effect.offset, meter: effect.meter, amount: effect.amount,
  }));
  const remainingScheduled = [...state.scheduledEffects.filter(effect => effect.dueTurn > state.turn).map(effect => ({ ...effect })), ...newScheduled].sort((a, b) => a.dueTurn - b.dueTurn);
  const failures = METERS.filter(meter => meters[meter.id] === 0).map(meter => ({ ...meter, shortfall: Math.max(0, -rawMeters[meter.id]) }));
  return {
    turn: state.turn, eventTitle: event.title, responseId, responseTitle: response.title,
    policyId, policyTitle: policy.title, startMeters: { ...state.meters }, meters, rawMeters,
    startDebt: state.debt, debt, newDebt: policy.debtChange,
    contributions, budget, due: due.map(effect => ({ ...effect })), newScheduled, remainingScheduled,
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
    history: [...state.history, report], outcome: report.outcome,
  };
}
export function advanceTurn(state) {
  requirePhase(state, 'report');
  if (state.outcome) return { ...state, phase: 'result' };
  const next = { ...state, turn: state.turn + 1, phase: 'event', selectedResponseId: null, selectedPolicyId: null, eventDeck: [...state.eventDeck] };
  next.currentEvent = revealEvent(next, next.eventDeck.shift());
  return next;
}
