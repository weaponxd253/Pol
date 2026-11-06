import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTurn, beginPolicyPhase, createInitialState, resolveTurn, selectPolicy, selectResponse } from '../js/engine.js';
import { canWalkCabinetRoom, getCabinetRoomExit } from '../js/cabinet-room-layout.js';
import { getRoomNpcs } from '../js/npc-content.js';

const [finance] = getRoomNpcs('CabinetRoomScene');

test('staff belong to their assigned rooms and the Finance Secretary stands on accessible floor', () => {
    assert.equal(getRoomNpcs('GovernmentCorridorScene')[0].name, 'Chief of Staff');
    assert.deepEqual(getRoomNpcs('OfficeScene'), []);
    assert.equal(finance.name, 'Finance Secretary');
    assert.equal(canWalkCabinetRoom(finance.x, finance.y), true);
    assert.equal(getCabinetRoomExit(finance.x, finance.y), null);
    assert.match(finance.briefing(null).message, /start or resume/i);
});

test('the Finance Secretary uses the run’s budget and does not mutate decisions', () => {
    const initial = createInitialState();
    assert.match(finance.briefing(initial).message, /baseline/);
    assert.equal(Object.fromEntries(finance.briefing(initial).figures).Treasury, 24);

    const policy = selectPolicy(beginPolicyPhase(selectResponse(initial, 'relief')), 'services');
    const original = structuredClone(policy);
    const projection = finance.briefing(policy);
    assert.match(projection.message, /projected budget/);
    assert.equal(Object.fromEntries(projection.figures)['Net budget'], -1);
    assert.deepEqual(policy, original);

    const report = resolveTurn(policy);
    const settled = finance.briefing(report);
    assert.match(settled.message, /settled the budget/);
    assert.equal(Object.fromEntries(settled.figures).Treasury, report.meters.treasury);
    assert.equal(Object.fromEntries(finance.briefing(advanceTurn(report)).figures)['Scheduled payments'], 3);
});
