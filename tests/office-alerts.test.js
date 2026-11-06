import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, selectResponse, beginPolicyPhase, selectPolicy, resolveTurn, advanceTurn } from '../js/engine.js';
import { governmentWarning, treasuryWarning } from '../js/office-alerts.js';

test('government warnings show all affected meters and escalate at ten', () => {
  const state = createInitialState({ mode: 'quick' });
  assert.equal(governmentWarning(state), null);

  state.meters.approval = 20;
  assert.equal(governmentWarning(state).severity, 'warning');
  state.meters.economy = 10;
  assert.deepEqual(governmentWarning(state), {
    severity: 'critical',
    title: 'Government crisis',
    message: 'Economy 10/100 · Public Approval 20/100'
  });
});

function resolveQuickTurn(state, response, policy) {
  return resolveTurn(selectPolicy(beginPolicyPhase(selectResponse(state, response)), policy));
}

test('Treasury alerts switch from upcoming to due this turn and clear on collapse', () => {
  const firstReport = resolveQuickTurn(createInitialState({ mode: 'quick' }), 'relief', 'services');
  const upcoming = treasuryWarning(firstReport);
  assert.equal(upcoming.dueTurn, 2);
  assert.equal(upcoming.severity, 'urgent');
  assert.match(upcoming.message, /3 Treasury due next turn \(Expand public services\)/);

  const secondTurn = advanceTurn(firstReport);
  assert.match(treasuryWarning(secondTurn).message, /3 Treasury due this turn/);

  const finalReport = resolveQuickTurn(secondTurn, 'settlement', 'regulations');
  assert.equal(finalReport.outcome, 'collapsed');
  assert.equal(treasuryWarning(finalReport), null);
  assert.equal(governmentWarning(finalReport).title, 'Government collapse');
  assert.match(governmentWarning(finalReport).message, /cannot meet its obligations/);
});

test('Treasury alerts group the earliest charges and reserve critical for no available buffer', () => {
  const state = createInitialState({ mode: 'term' });
  state.turn = 11;
  state.scheduledEffects = [
    { dueTurn: 11, meter: 'treasury', amount: -2, source: 'Wages' },
    { dueTurn: 11, meter: 'treasury', amount: -4, source: 'Services' },
    { dueTurn: 11, meter: 'treasury', amount: 4, source: 'Aid' },
    { dueTurn: 12, meter: 'treasury', amount: -6, source: 'Services' },
    { dueTurn: 13, meter: 'treasury', amount: -8, source: 'Pensions' }
  ];

  state.meters.treasury = 17;
  assert.equal(treasuryWarning(state).severity, 'normal');
  state.meters.treasury = 6;
  assert.equal(treasuryWarning(state).severity, 'critical');
  assert.match(treasuryWarning(state).message, /6 Treasury due this turn \(Wages, Services\)/);
  state.meters.treasury = 5;
  assert.match(treasuryWarning(state).message, /fall short by 1/);

  state.phase = 'report';
  assert.equal(treasuryWarning(state).dueTurn, 12);
  state.phase = 'event';
  state.turn = 12;
  state.scheduledEffects = state.scheduledEffects.filter(effect => effect.dueTurn > 12);
  assert.equal(treasuryWarning(state), null);

  state.outcome = 'election-lost';
  state.meters.approval = 10;
  assert.equal(governmentWarning(state), null);
});
