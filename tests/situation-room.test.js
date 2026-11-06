import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, selectResponse, beginPolicyPhase, selectPolicy, resolveTurn } from '../js/engine.js';
import { getSituationBriefing } from '../js/situation-briefing.js';
import {
    SITUATION_ENTRANCE, SITUATION_EXITS, SITUATION_STATIONS, canWalkSituationRoom, getSituationInteraction
} from '../js/situation-room-layout.js';
import { getCorridorDoor } from '../js/corridor-layout.js';

test('the corridor south passage leads to an accessible north entrance and walkable stations', () => {
    assert.equal(getCorridorDoor(480, 680).action, 'situation-room');
    const { x, y } = SITUATION_ENTRANCE;
    assert.equal(canWalkSituationRoom(x, y), true);
    assert.equal(getSituationInteraction(x, y), null);
    assert.equal(getSituationInteraction(480, 680), null);
    for (const interaction of [...SITUATION_EXITS, ...SITUATION_STATIONS]) {
        assert.equal(getSituationInteraction(interaction.x + interaction.w / 2, interaction.y + interaction.h / 2), interaction);
    }
});

test('the north and south aisles connect around the table while furniture and walls remain solid', () => {
    for (const x of [170, 790]) {
        for (let y = 279; y <= 530; y++) assert.equal(canWalkSituationRoom(x, y), true);
    }
    for (let x = 170; x <= 790; x++) {
        assert.equal(canWalkSituationRoom(x, 279), true);
    }
    for (const [x, y] of [[380, 100], [610, 100], [225, 250], [735, 250], [480, 410], [360, 523], [300, 640]]) {
        assert.equal(canWalkSituationRoom(x, y), false);
    }
});

test('emergency briefings follow existing event, policy, and report transitions', () => {
    const start = createInitialState();
    assert.equal(getSituationBriefing(null, 'emergency').action, undefined);
    const briefing = getSituationBriefing(start, 'emergency');
    assert.equal(briefing.title, 'Economic slowdown');
    assert.match(briefing.entries[0].text, /Treasury -10/);
    assert.equal(briefing.action.id, 'advisors');

    const policy = beginPolicyPhase(selectResponse(start, 'relief'));
    assert.match(getSituationBriefing(policy, 'emergency').entries[0].title, /selected/);
    assert.equal(getSituationBriefing(policy, 'diplomacy').action.id, 'national-policies');
    assert.ok(getSituationBriefing(policy, 'security').entries.some(item => item.title === 'Expand public services'));
    const report = resolveTurn(selectPolicy(policy, 'services'));
    assert.equal(getSituationBriefing(report, 'emergency').action.id, 'cabinet-briefing');
    assert.match(getSituationBriefing(report, 'map', 'supply').entries[0].text, /Scheduled payments 3/);
});

test('map views and intelligence use current records without advancing or mutating the run', () => {
    const state = createInitialState({ mode: 'term' });
    state.nationConditions = [{ conditionId: 'emergency-preparedness', startTurn: 1, lastTurn: 3 }];
    state.reviewReservations = [{ reviewId: 'wage-review', reservedTurn: 4 }];
    const original = structuredClone(state);
    assert.equal(getSituationBriefing(state, 'map', 'arden').metrics[0].label, 'Stability');
    assert.equal(getSituationBriefing(state, 'map', 'partners').metrics[0].label, 'International Standing');
    assert.equal(getSituationBriefing(state, 'map', 'supply').metrics[0].value, state.meters.treasury);
    const entries = getSituationBriefing(state, 'intelligence').entries;
    assert.ok(entries.some(item => item.title === 'Emergency preparedness'));
    assert.ok(entries.some(item => item.text === 'Wage support review'));
    assert.deepEqual(state, original);
});
