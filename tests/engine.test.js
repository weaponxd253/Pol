import test from 'node:test';
import assert from 'node:assert/strict';
import { METERS, validateContent } from '../js/content.js';
import { createInitialState, getEvent, selectResponse, beginPolicyPhase, selectPolicy, calculateTurn, resolveTurn, advanceTurn, forecastBudget } from '../js/engine.js';

function prepare(state, response, policy) {
  return selectPolicy(beginPolicyPhase(selectResponse(state, response)), policy);
}

function run(choices) {
  let state = createInitialState();
  for (const [response, policy] of choices) {
    state = resolveTurn(prepare(state, response, policy));
    state = advanceTurn(state);
    if (state.phase === 'result') break;
  }
  return state;
}

test('content has valid, unique IDs and meter effects', () => assert.doesNotThrow(validateContent));

test('popular route pays both service bills and retains debt', () => {
  const state = run([['relief', 'services'], ['settlement', 'bonds'], ['oversight', 'cuts']]);
  assert.equal(state.outcome, 'survived');
  assert.deepEqual(state.history.map(report => [report.meters.treasury, report.meters.approval, report.debt, report.budget.total]), [[7, 75, 0, -1], [12, 80, 18, -5], [25, 66, 18, -5]]);
  assert.deepEqual(state.history.map(report => report.budget.commitments), [0, 3, 3]);
  assert.equal(state.scheduledEffects.length, 0);
  assert.equal(forecastBudget(state).budget.total, -2);
});

test('frugal route applies next-turn economic damage before revenue', () => {
  const state = run([['absorb', 'taxes'], ['freeze', 'regulations'], ['oversight', 'aid']]);
  assert.deepEqual(state.history.map(report => [report.meters.treasury, report.meters.approval, report.budget.total]), [[34, 54, -2], [33, 43, -1], [48, 33, -1]]);
  assert.equal(state.history[1].meters.economy, 50);
  assert.equal(state.history[1].due[0].amount, -3);
  assert.equal(state.debt, 0);
  assert.equal(state.outcome, 'survived');
});

test('collapse preserves the raw shortfall and offers a rescue before resolution', () => {
  let state = advanceTurn(resolveTurn(prepare(createInitialState(), 'relief', 'services')));
  state = prepare(state, 'settlement', 'regulations');
  const snapshot = structuredClone(state);
  const forecast = calculateTurn(state);
  assert.equal(forecast.meters.treasury, 0);
  assert.equal(forecast.rawMeters.treasury, -4);
  assert.equal(forecast.failures[0].shortfall, 4);
  assert.equal(forecast.meters.approval, 76);
  assert.deepEqual(state, snapshot);
  const rescued = resolveTurn(selectPolicy(state, 'bonds'));
  assert.equal(rescued.meters.treasury, 12);
  assert.equal(rescued.outcome, null);
  assert.equal(rescued.history[1].budget.interest, 1);
  const collapsed = advanceTurn(resolveTurn(state));
  assert.equal(collapsed.phase, 'result');
  assert.equal(collapsed.outcome, 'collapsed');
});

test('preview and commit agree without mutating inputs', () => {
  const state = prepare(createInitialState(), 'relief', 'services');
  const before = structuredClone(state);
  const forecast = calculateTurn(state);
  const resolved = resolveTurn(state);
  assert.deepEqual(state, before);
  assert.deepEqual(resolved.history[0], forecast);
  assert.deepEqual(resolved.meters, forecast.meters);
  assert.deepEqual(resolved.scheduledEffects, forecast.newScheduled);
});

test('invalid phases, responses, repeated commits, and used cards are rejected', () => {
  const initial = createInitialState();
  assert.throws(() => resolveTurn(initial));
  assert.throws(() => beginPolicyPhase(initial));
  assert.throws(() => selectResponse(initial, 'settlement'));
  const prepared = prepare(initial, 'relief', 'services');
  assert.throws(() => calculateTurn(prepared, 'absorb', 'services'));
  const report = resolveTurn(prepared);
  assert.throws(() => resolveTurn(report));
  const next = beginPolicyPhase(selectResponse(advanceTurn(report), 'freeze'));
  assert.throws(() => selectPolicy(next, 'services'));
  assert.throws(() => calculateTurn(next, 'freeze', 'unknown'));
});

test('final-turn promises persist and next forecast includes scheduled Economy changes', () => {
  const services = run([['absorb', 'cuts'], ['freeze', 'bonds'], ['oversight', 'services']]);
  assert.deepEqual(services.scheduledEffects.map(effect => effect.dueTurn), [4, 5]);
  assert.equal(forecastBudget(services).budget.commitments, 3);
  const taxes = run([['absorb', 'cuts'], ['freeze', 'aid'], ['oversight', 'taxes']]);
  assert.equal(taxes.meters.economy, 48);
  assert.equal(forecastBudget(taxes).economy, 45);
  assert.equal(forecastBudget(taxes).due[0].sourceId, 'taxes');
  const nearRevenueBoundary = { ...taxes, meters: { ...taxes.meters, economy: 50 } };
  assert.equal(forecastBudget(nearRevenueBoundary).economy, 47);
  assert.equal(forecastBudget(nearRevenueBoundary).budget.revenue, 12);
});

test('turn-three refinancing terms use debt before the chosen policy', () => {
  const lowDebt = run([['absorb', 'cuts'], ['freeze', 'aid']]);
  assert.equal(getEvent(lowDebt).responses[1].effects.treasury, undefined);
  const lateBonds = calculateTurn(prepare(lowDebt, 'decline', 'bonds'));
  assert.equal(lateBonds.debt, 18);
  assert.equal(lateBonds.contributions.treasury.some(effect => effect.type === 'event'), false);
  const highDebt = run([['absorb', 'bonds'], ['freeze', 'aid']]);
  assert.equal(getEvent(highDebt).responses[1].effects.treasury, -4);
});

test('meter changes combine before clamping and all failure causes are recorded', () => {
  const state = prepare(createInitialState(), 'relief', 'cuts');
  state.meters.treasury = 4;
  state.meters.approval = 99;
  const report = calculateTurn(state);
  assert.equal(report.meters.approval, 97);
  assert.equal(report.meters.treasury, 3);
  const failing = prepare(createInitialState(), 'absorb', 'cuts');
  for (const meter of METERS) failing.meters[meter.id] = 1;
  assert.ok(calculateTurn(failing).failures.length > 1);
});

test('new scenarios have independent state and reproduce identical routes', () => {
  const one = createInitialState();
  one.scheduledEffects.push({ meter: 'treasury', amount: -99, dueTurn: 1 });
  assert.deepEqual(createInitialState().scheduledEffects, []);
  const route = [['relief', 'services'], ['settlement', 'bonds'], ['oversight', 'cuts']];
  assert.deepEqual(run(route), run(route));
});
