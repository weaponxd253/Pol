import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceTurn, beginPolicyPhase, createInitialState, resolveTurn, selectPolicy, selectResponse } from '../js/engine.js';
import { getRoomNpcs } from '../js/npc-content.js';
import { getNpcDialogue } from '../js/npc-dialogue.js';

const [finance] = getRoomNpcs('CabinetRoomScene');
const stateWith = (treasury, debt = 0) => {
    const state = createInitialState();
    state.meters.treasury = treasury;
    state.debt = debt;
    return state;
};
const payment = (dueTurn, amount, meter = 'treasury') => ({ dueTurn, amount, meter, source: 'Public services' });
const message = state => getNpcDialogue(finance, state).message;
const objective = state => getNpcDialogue(finance, state, 'finance-objective');
const select = state => selectPolicy(beginPolicyPhase(selectResponse(state, 'absorb')), 'cuts');

test('walking up opens a conversational financial update and preserves detailed topics', () => {
    const state = createInitialState();
    const answer = getNpcDialogue(finance, state);
    assert.equal(answer.selected, 'finances');
    assert.equal(answer.topics[0].label, 'How are things going?');
    assert.match(answer.message, /Treasury is 24, debt is zero/);
    assert.match(answer.message, /tea/);
    for (const topic of ['treasury', 'payments', 'debt', 'decisions', 'finance-objective']) {
        assert.equal(getNpcDialogue(finance, state, topic).selected, topic);
    }
    assert.equal(getNpcDialogue(finance, state, 'unknown').selected, 'finances');
});

test('normal updates distinguish orderly reserves, manageable debt, and upcoming bills', () => {
    assert.match(message(stateWith(45, 10)), /10 debt.*1 per turn.*breathing room/);
    const state = stateWith(45, 10);
    state.scheduledEffects = [payment(2, -3), payment(2, -4)];
    assert.match(message(state), /payments total 7, due next turn on turn 2/);
    assert.match(message(state), /pleasantly uneventful/);
});

test('Treasury warnings escalate at the shared 20 and 10 boundaries', () => {
    assert.match(message(stateWith(21)), /books are orderly/);
    assert.match(message(stateWith(20)), /little room for surprises/);
    assert.match(message(stateWith(11)), /little room for surprises/);
    assert.match(message(stateWith(10)), /emergency territory/);
});

test('debt warnings follow the scenario threshold and exact rounded interest', () => {
    assert.match(message(stateWith(45, 17)), /breathing room/);
    assert.match(message(stateWith(45, 18)), /Debt stands at 18.*1 Treasury in interest.*financing costs/);
    const term = createInitialState({ mode: 'term' });
    term.debt = 29;
    assert.match(message(term), /29 debt.*2 per turn/);
    term.debt = 30;
    assert.match(message(term), /Debt stands at 30.*financing costs/);
});

test('payment warnings aggregate only negative Treasury charges and check both turns', () => {
    const state = stateWith(30);
    state.scheduledEffects = [payment(1, -2), payment(2, -10), payment(2, -10),
        payment(2, 8), payment(2, -99, 'approval')];
    assert.match(message(state), /payments of 20 arrive next turn.*leaves only 10 before other turn effects/);
    state.scheduledEffects.push(payment(2, -10));
    assert.match(message(state), /30 in scheduled payments due next turn.*bills alone leave no reserve/);
    state.scheduledEffects.push(payment(2, -1));
    assert.match(message(state), /31 in scheduled payments/);
});

test('a dangerous full budget takes priority over debt and an apparently healthy reserve', () => {
    const state = stateWith(25, 30);
    state.scheduledEffects = [payment(1, -24)];
    assert.match(message(state), /Before counting this turn’s response and policy.*turn 1 is -1.*exhaust our funds/);
    const chosen = select(state);
    // Absorb + cuts restores the forecast; the baseline crisis must disappear.
    assert.doesNotMatch(message(chosen), /would exhaust our funds/);
    assert.match(message(chosen), /leaves only 1 before other turn effects/);
});

test('selected choices change the financial outlook without changing the run', () => {
    const initial = createInitialState();
    const chosen = selectPolicy(beginPolicyPhase(selectResponse(initial, 'relief')), 'services');
    const saved = structuredClone(chosen);
    assert.match(message(chosen), /With your selected response and policy.*turn 1 would leave 7/);
    const answer = objective(chosen);
    assert.match(answer.message, /Treasury would finish turn 1 at 7/);
    assert.equal(Object.fromEntries(answer.figures).Destination, 'National Policy Desk');
    assert.deepEqual(chosen, saved);
    chosen.meters.treasury = 17;
    assert.match(message(chosen), /selected response and policy.*turn 1 is 0.*exhaust/);
    assert.match(objective(chosen).message, /Revise the choice before approval/);
});

test('objectives track response selection, policy selection, and settled accounts', () => {
    const initial = createInitialState();
    assert.match(objective(initial).message, /Chief of Staff briefing.*choose a response/);
    assert.match(objective(initial).message, new RegExp(initial.currentEvent.title));
    const response = selectResponse(initial, 'absorb');
    assert.match(objective(response).message, /response is selected.*Finish the Chief of Staff/);
    assert.match(objective(beginPolicyPhase(response)).message, /Choose a policy.*combined forecast/);
    const report = resolveTurn(select(initial));
    assert.match(objective(report).message, /settled figures at the Cabinet Briefing Table/);
    assert.match(objective(report).message, new RegExp(`${report.meters.treasury} Treasury`));
});

test('settlement removes paid bills and updates timing without inventing later payments', () => {
    const initial = stateWith(60);
    initial.scheduledEffects = [payment(1, -3), payment(2, -4), payment(3, -99)];
    const report = resolveTurn(select(initial));
    assert.match(message(report), /payments total 4, due next turn on turn 2/);
    const next = advanceTurn(report);
    assert.match(message(next), /99 in scheduled payments due next turn.*turn 3/);
    const finalTurn = stateWith(45);
    finalTurn.turn = 3;
    finalTurn.scheduledEffects = [payment(4, -99), payment(2, -99)];
    assert.match(message(finalTurn), /books are orderly/);
});

test('completed terms discuss the legacy while collapse keeps the existing failure report', () => {
    const report = resolveTurn(select(createInitialState()));
    const completed = { ...report, turn: 3, outcome: 'survived' };
    completed.meters.treasury = 8;
    completed.scheduledEffects = [payment(4, -99)];
    assert.match(message(completed), /survived the first 90 days.*ledger open/);
    assert.match(message(completed), /Final figures: Treasury 8\/100.*final consequences/);
    assert.doesNotMatch(message(completed), /emergency territory|before approval/);
    assert.equal(Object.fromEntries(objective({ ...completed, phase: 'result' }).figures).Destination, 'Final Results');
    const collapsed = { ...completed, outcome: 'collapsed' };
    collapsed.meters.treasury = 0;
    assert.match(message(collapsed), /Treasury reached zero/);
    assert.deepEqual(getNpcDialogue(finance, collapsed).topics, []);
});
