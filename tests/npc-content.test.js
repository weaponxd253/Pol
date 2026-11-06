import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTurn, beginPolicyPhase, createInitialState, resolveTurn, selectPolicy, selectResponse } from '../js/engine.js';
import { canWalkCabinetRoom, getCabinetRoomExit } from '../js/cabinet-room-layout.js';
import { canWalkCorridor, getCorridorDoor } from '../js/corridor-layout.js';
import { canWalkPressRoom, getPressRoomExit } from '../js/press-room-layout.js';
import { canWalkSituationRoom, getSituationInteraction } from '../js/situation-room-layout.js';
import { getRoomNpcs } from '../js/npc-content.js';
import { getNpcDialogue } from '../js/npc-dialogue.js';

const [finance] = getRoomNpcs('CabinetRoomScene');
const [chief, aide] = getRoomNpcs('GovernmentCorridorScene');
const [defense] = getRoomNpcs('SituationRoomScene');
const [press] = getRoomNpcs('PressBriefingRoomScene');

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
    assert.match(getNpcDialogue(finance, null).message, /start or resume/i);
    assert.match(getNpcDialogue(aide, null).message, /south passage/);
});

test('the Finance Secretary uses the run’s budget and does not mutate decisions', () => {
    const initial = createInitialState();
    assert.match(getNpcDialogue(finance, initial).message, /baseline/);
    assert.match(Object.fromEntries(getNpcDialogue(finance, initial).figures).Treasury, /24\/100/);

    const policy = selectPolicy(beginPolicyPhase(selectResponse(initial, 'relief')), 'services');
    const original = structuredClone(policy);
    const projection = getNpcDialogue(finance, policy);
    assert.match(projection.message, /projected budget/);
    assert.equal(Object.fromEntries(projection.figures)['Net budget'], '-1');
    assert.deepEqual(policy, original);

    const report = resolveTurn(policy);
    const settled = getNpcDialogue(finance, report);
    assert.match(settled.message, /settled the budget/);
    assert.match(Object.fromEntries(settled.figures).Treasury, new RegExp(`^${report.meters.treasury}/100`));
    assert.equal(Object.fromEntries(getNpcDialogue(finance, advanceTurn(report)).figures)['Scheduled payments'], 3);
});

function settle(state, response, policy) {
    return resolveTurn(selectPolicy(beginPolicyPhase(selectResponse(state, response)), policy));
}

test('role readings distinguish healthy, declining, low, and critical meters', () => {
    const initial = createInitialState();
    assert.equal(getNpcDialogue(chief, initial).figures.length, 6);
    assert.match(getNpcDialogue(defense, initial).figures[0][1], /Healthy/);
    const state = settle(initial, 'absorb', 'cuts');
    assert.match(getNpcDialogue(defense, state).figures[0][1], /Declining/);
    assert.match(getNpcDialogue(press, state).figures[0][1], /Declining/);
    state.meters.stability = 20;
    state.meters.approval = 10;
    assert.match(getNpcDialogue(defense, state).figures[0][1], /Low/);
    assert.equal(getNpcDialogue(defense, state).alert.message, 'Stability 20/100');
    assert.match(getNpcDialogue(press, state).figures[0][1], /Critical/);
    assert.equal(getNpcDialogue(press, state).alert.message, 'Public Approval 10/100');
});

test('Treasury urgency takes precedence and payment topics distinguish dates and sources', () => {
    const report = settle(createInitialState(), 'relief', 'services');
    const closed = getNpcDialogue(finance, report, 'payments');
    assert.match(closed.entries[0].text, /already settled/);
    assert.match(closed.entries[1].text, /Expand public services · 3 Treasury/);

    const state = advanceTurn(report);
    state.meters.approval = 12;
    state.scheduledEffects.push({ dueTurn: 2, source: 'Emergency contract', meter: 'treasury', amount: -6 });
    const briefing = getNpcDialogue(finance, state, 'payments');
    assert.equal(getNpcDialogue(press, state).alert.title, 'Treasury payment risk');
    assert.match(briefing.entries[0].title, /This turn/);
    assert.match(briefing.entries[0].text, /Emergency contract · 6 Treasury/);
    assert.match(briefing.entries[1].title, /Next turn/);
    assert.match(briefing.entries[1].text, /Expand public services · 3 Treasury/);
    state.meters.treasury = 35;
    state.scheduledEffects.push({ dueTurn: 3, source: 'Deferred purchase', meter: 'treasury', amount: -40 });
    assert.equal(getNpcDialogue(finance, state).alert.dueTurn, 3);
});

test('debt warnings use the active scenario’s financing thresholds', () => {
    const quick = { ...createInitialState(), debt: 18 };
    const term = { ...createInitialState({ mode: 'term' }), debt: 18 };
    assert.match(getNpcDialogue(finance, quick, 'debt').message, /increase financing costs/);
    assert.match(getNpcDialogue(finance, term, 'debt').message, /adds interest/);
});

test('reactions separate direct policy effects from the full turn and only use completed decisions', () => {
    const state = settle(createInitialState(), 'relief', 'services');
    const [entry] = getNpcDialogue(finance, state, 'decisions').entries;
    assert.match(entry.title, /Expand public services/);
    assert.match(entry.text, /Treasury -6/);
    assert.match(entry.text, /3 Treasury on turn 2/);
    assert.match(entry.text, /Treasury -17/);
    const projected = selectPolicy(beginPolicyPhase(selectResponse(advanceTurn(state), 'freeze')), 'aid');
    assert.equal(getNpcDialogue(defense, projected, 'decisions').entries.length, 1);
    const enacted = resolveTurn(projected);
    assert.match(getNpcDialogue(defense, enacted, 'decisions').entries[0].text, /International Standing \+7/);
});

test('meeting reminders follow the objective and collapse replaces all normal topics', () => {
    const initial = createInitialState();
    assert.match(getNpcDialogue(aide, initial, 'meeting').message, /Chief of Staff briefing/);
    const selected = selectResponse(initial, 'relief');
    assert.match(getNpcDialogue(aide, selected, 'meeting').message, /response has been selected/);
    const policy = beginPolicyPhase(selected);
    assert.match(getNpcDialogue(aide, policy, 'meeting').message, /National Policy Desk/);
    const report = resolveTurn(selectPolicy(policy, 'services'));
    assert.match(getNpcDialogue(aide, report, 'meeting').message, /Cabinet Briefing Table/);
    const collapsed = settle(advanceTurn(report), 'settlement', 'regulations');
    for (const npc of [chief, aide, finance, defense, press]) {
        const briefing = getNpcDialogue(npc, collapsed, 'decisions');
        assert.equal(briefing.alert.title, 'Government collapse');
        assert.match(briefing.alert.message, /cannot meet its obligations/);
        assert.match(briefing.message, /Treasury reached zero/);
        assert.deepEqual(briefing.topics, []);
    }
});
