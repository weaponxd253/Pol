import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTurn, beginPolicyPhase, createInitialState, resolveTurn, selectPolicy, selectResponse } from '../js/engine.js';
import { canWalkCabinetRoom, getCabinetRoomExit } from '../js/cabinet-room-layout.js';
import { canWalkCorridor, getCorridorDoor } from '../js/corridor-layout.js';
import { canWalkPressRoom, getPressRoomExit } from '../js/press-room-layout.js';
import { canWalkSituationRoom, getSituationInteraction } from '../js/situation-room-layout.js';
import { getRoomNpcs } from '../js/npc-content.js';

const [finance] = getRoomNpcs('CabinetRoomScene');

test('staff stand on accessible floor in their assigned rooms, clear of doors and stations', () => {
    assert.deepEqual(getRoomNpcs('GovernmentCorridorScene').map(npc => npc.name), ['Chief of Staff', 'Government Aide']);
    assert.deepEqual(getRoomNpcs('OfficeScene'), []);
    const placements = [
        ['CabinetRoomScene', 'Finance Secretary', canWalkCabinetRoom, getCabinetRoomExit],
        ['SituationRoomScene', 'Defense Secretary', canWalkSituationRoom, getSituationInteraction],
        ['PressBriefingRoomScene', 'Press Secretary', canWalkPressRoom, getPressRoomExit],
        ['GovernmentCorridorScene', 'Government Aide', canWalkCorridor, getCorridorDoor]
    ];
    for (const [room, name, canWalk, getInteraction] of placements) {
        const { x, y } = getRoomNpcs(room).find(npc => npc.name === name);
        assert.equal(canWalk(x, y), true, name);
        assert.equal(getInteraction(x, y), null, name);
    }
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
