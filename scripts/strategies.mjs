import { createInitialState, getEvent, getPolicies, policyDetails, selectResponse, beginPolicyPhase, selectPolicy, calculateTurn, resolveTurn, advanceTurn, forecastBudget } from '../js/engine.js';
import { getScenario } from '../js/content.js';

export function candidates(state) {
  const result = [];
  for (const response of getEvent(state).responses) {
    const pending = beginPolicyPhase(selectResponse(state, response.id));
    for (const definition of getPolicies(state).filter(policy => state.hand.includes(policy.id))) {
      if (policyDetails(state, definition).disabledReason) continue;
      result.push({ responseId: response.id, policyId: definition.id, projection: calculateTurn(pending, response.id, definition.id) });
    }
  }
  return result;
}

export function rankChoice(state, choice, strategy = 'adaptive') {
  const report = choice.projection;
  const meterValues = Object.values(report.meters);
  const weights = {
    public: { approval: 5, treasury: .2, donors: .3, economy: .5, international: .4, stability: .6 },
    fiscal: { treasury: 4, approval: .6, economy: 1.5, donors: .7, international: .4, stability: .8 },
    investment: { economy: 4, treasury: 1.5, approval: 1.3, donors: .6, international: 1, stability: 1.5 },
    adaptive: { approval: 1.8, treasury: 1.3, economy: 1.8, donors: 1.2, international: 1.1, stability: 1.4 },
  };
  if (strategy === 'reckless') return -report.meters.treasury * 10 + report.meters.approval;
  const weight = weights[strategy];
  let score = Object.entries(weight).reduce((sum, [key, value]) => sum + report.meters[key] * value, 0);
  if (report.failures.length) score -= 100000;
  if (strategy === 'adaptive') {
    score += Math.min(...meterValues) * 2;
    score -= meterValues.reduce((sum, value) => sum + Math.max(0, 30 - value) ** 2, 0);
    if (state.turn >= 9) score -= Math.max(0, 50 - report.meters.approval) * 4;
  }
  for (const future of report.remainingScheduled) {
    const horizon = Math.min(1, Math.max(0, 13 - future.dueTurn) / 3);
    score += future.amount * (weight[future.meter] || 1) * horizon * (strategy === 'investment' ? 1 : .5);
  }
  // Estimate conditional value from public history and remaining time, never hidden deck order.
  const scenario = getScenario(state.mode);
  const seen = new Set([...state.history.map(item => item.eventId), getEvent(state).id]);
  const unseenCount = scenario.events.filter(event => !seen.has(event.id)).length;
  for (const instance of report.remainingNationConditions) {
    const definition = scenario.nationConditions.find(item => item.id === instance.conditionId);
    const window = Math.max(0, Math.min(instance.lastTurn, scenario.turns) - Math.max(state.turn + 1, instance.startTurn) + 1);
    const chance = Math.min(1, window / Math.max(1, unseenCount));
    const targets = [...new Set(definition.modifiers.map(item => item.eventId))].filter(id => !seen.has(id));
    for (const eventId of targets) {
      const alternatives = definition.modifiers.filter(item => item.eventId === eventId);
      score += alternatives.reduce((sum, item) => sum + Object.entries(item.effects).reduce((value, [meter, amount]) => value + amount * weight[meter], 0), 0) / scenario.events.find(event => event.id === eventId).responses.length * chance * .5;
    }
  }
  for (const review of report.newReviews.filter(item => item.reservedTurn <= scenario.turns)) {
    const event = scenario.reviews.find(item => item.id === review.reviewId);
    const value = response => Object.entries(response.effects).reduce((sum, [meter, amount]) => sum + amount * weight[meter], 0) + (response.future || []).reduce((sum, item) => sum + item.amount * weight[item.meter], 0);
    score += Math.max(...event.responses.map(value)) * .25;
  }
  score -= report.debt * (strategy === 'fiscal' ? 1 : .25);
  const nextBudget = forecastBudget({ ...state, meters: report.meters, debt: report.debt, scheduledEffects: report.remainingScheduled }).budget.total;
  score += nextBudget * (strategy === 'adaptive' ? 1.5 : .5);
  return score;
}

export function choose(state, strategy = 'adaptive', excluded = []) {
  return candidates(state).filter(choice => !excluded.includes(choice.policyId)).sort((a, b) => rankChoice(state, b, strategy) - rankChoice(state, a, strategy))[0];
}

export function play(seed, strategy = 'adaptive') {
  let state = createInitialState({ mode: 'term', seed });
  while (!state.outcome) {
    const choice = choose(state, strategy);
    if (!choice) throw new Error('No playable policy at turn ' + state.turn);
    state = advanceTurn(resolveTurn(selectPolicy(beginPolicyPhase(selectResponse(state, choice.responseId)), choice.policyId)));
  }
  return state;
}
