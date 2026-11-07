import assert from 'node:assert/strict';
import test from 'node:test';
import { METERS } from '../js/content.js';
import { advanceTurn, beginPolicyPhase, createInitialState, resolveTurn, selectPolicy, selectResponse } from '../js/engine.js';
import { getRoomNpcs } from '../js/npc-content.js';
import { getNpcDialogue } from '../js/npc-dialogue.js';

const [chief, aide] = getRoomNpcs('GovernmentCorridorScene');
const [defense] = getRoomNpcs('SituationRoomScene');
const [press] = getRoomNpcs('PressBriefingRoomScene');
const [finance] = getRoomNpcs('CabinetRoomScene');
const remaining = [chief, defense, press, aide];
const everyone = [...remaining, finance];
const say = (npc, state, topic) => getNpcDialogue(npc, state, topic).message;
const choose = (state, response, policy) => selectPolicy(beginPolicyPhase(selectResponse(state, response)), policy);
const settle = (state, response, policy) => resolveTurn(choose(state, response, policy));
const objectiveTopic = npc => npc === aide ? 'meeting' : npc === finance ? 'finance-objective' : 'objective';

test('every official opens with a personal update and keeps their existing specialist topics', () => {
    const state = createInitialState();
    const voices = [
        [chief, /Approval is 60.*Stability is 60.*agenda/],
        [defense, /Stability and International Standing are 60 and 60.*quiet situation room/],
        [press, /Approval is 60.*Donor Confidence is 60.*headlines/],
        [aide, /Approval is 60.*Stability is 60.*folder/]
    ];
    for (const [npc, voice] of voices) {
        const answer = getNpcDialogue(npc, state);
        assert.equal(answer.selected, 'status');
        assert.equal(answer.topics[0].label, 'How are things going?');
        assert.match(answer.message, voice);
        assert.match(answer.message, /Economic slowdown.*choose a response/);
        assert.doesNotMatch(answer.message, /turn 1’s/);
        for (const { id } of answer.topics) assert.equal(getNpcDialogue(npc, state, id).selected, id);
        assert.equal(getNpcDialogue(npc, state, 'unknown').selected, 'status');
    }
    assert.match(say(aide, null), /south passage/);
    for (const npc of [chief, defense, press]) assert.match(say(npc, null), /Start or resume/);
});

test('warnings and crises follow each portfolio and prioritize critical readings', () => {
    const state = createInitialState();
    state.meters.economy = 10;
    assert.match(say(chief, state), /Economy is 10\/100.*government crisis/);
    assert.doesNotMatch(say(defense, state), /government crisis/);
    state.meters.stability = 29;
    assert.match(say(defense, state), /below the disruption threshold of 30/);
    state.meters.international = 10;
    assert.match(say(defense, state), /International Standing is 10\/100.*diplomatic isolation/);
    state.meters.stability = 10;
    assert.match(say(defense, state), /institutions are close to being overwhelmed/);
    assert.match(say(aide, state), /Stability is 10\/100.*urgent/);
    state.meters.approval = 20;
    assert.match(say(press, state), /Public Approval is 20\/100.*Support is fragile/);
    state.meters.donors = 10;
    assert.match(say(press, state), /Donor Confidence is 10\/100.*funding is close to collapse/);
    state.meters.approval = 10;
    assert.match(say(press, state), /close to losing our mandate/);
});

test('warning boundaries, domestic disruption, and normal fallbacks match the live statistics', () => {
    const state = createInitialState();
    for (const meter of METERS) state.meters[meter.id] = 40;
    for (const npc of remaining) {
        assert.doesNotMatch(say(npc, state), /government crisis|marked the government notices as urgent|Support is fragile|warning threshold of 30/);
    }
    state.meters.stability = 30;
    assert.doesNotMatch(say(defense, state), /below the disruption threshold/);
    state.meters.international = 20;
    assert.match(say(defense, state), /diplomatic margin is thin/);
    state.meters.international = 21;
    assert.doesNotMatch(say(defense, state), /diplomatic margin is thin/);
    state.meters.treasury = 20;
    assert.match(say(chief, state), /Treasury is 20\/100.*running short of room/);
    assert.match(say(aide, state), /Treasury is 20\/100.*only yellow/);
    state.meters.treasury = 21;
    assert.doesNotMatch(say(chief, state), /running short of room/);
    assert.doesNotMatch(say(aide, state), /only yellow/);
});

test('election warnings use the full-term target without prematurely declaring defeat', () => {
    const term = createInitialState({ mode: 'term' });
    term.turn = 10;
    term.meters.approval = 49;
    assert.match(say(chief, term), /below the election target of 50, with 3 turn settlements remaining/);
    assert.match(say(press, term), /warning, not a result/);
    term.meters.approval = 50;
    assert.doesNotMatch(say(chief, term), /below the election target/);
    assert.doesNotMatch(say(press, term), /below the election target/);
    const quick = createInitialState();
    quick.turn = 3;
    quick.meters.approval = 49;
    assert.doesNotMatch(say(press, quick), /election target/);
});

test('the Chief and Aide surface the urgent payment notice from either unsettled turn', () => {
    const state = createInitialState();
    state.scheduledEffects = [
        { dueTurn: 1, meter: 'treasury', amount: -1, source: 'Small bill' },
        { dueTurn: 2, meter: 'treasury', amount: -24, source: 'Public services' }
    ];
    assert.match(say(chief, state), /payment crisis.*24 Treasury due next turn/);
    assert.match(say(aide, state), /urgent Treasury notice.*Public services/);
    state.scheduledEffects[1].amount = -14;
    assert.match(say(aide, state), /schedule needs attention.*leave 10 Treasury/);
    state.scheduledEffects[1].amount = -13;
    assert.doesNotMatch(say(aide, state), /schedule needs attention/);
});

test('completed policies produce different personal reactions with exact effects and full-turn attribution', () => {
    const initial = createInitialState();
    const cuts = settle(initial, 'absorb', 'cuts');
    const services = settle(initial, 'absorb', 'services');
    const cutVoices = [[chief, /awkward figures/], [defense, /overly cautious/],
        [press, /fix the experience/], [aide, /Old folders/]];
    for (const [npc, voice] of cutVoices) {
        assert.match(say(npc, cuts), voice);
        assert.match(say(npc, cuts), /turn 1’s “Cut discretionary spending” directly applied/);
        assert.notEqual(say(npc, cuts), say(npc, services));
    }
    assert.match(say(defense, cuts), /directly applied Stability -5.*full turn changed Stability -9 across all causes/);
    assert.match(say(press, cuts), /directly applied Public Approval -8.*full turn changed Public Approval -14/);
    assert.match(say(finance, cuts), /In the ledger.*Cut discretionary spending.*Treasury \+10/);
    assert.match(say(defense, services), /directly applied Stability \+4/);
    assert.doesNotMatch(say(defense, services), /full turn changed/); // +4 policy exactly offsets -4 from the event.
});

test('memory retains the latest relevant enacted policy and never attributes a preview to history', () => {
    const first = settle(createInitialState(), 'absorb', 'services');
    const next = advanceTurn(first);
    const chosen = choose(next, 'freeze', 'bonds');
    for (const npc of remaining) {
        const line = say(npc, chosen);
        assert.match(line, /“Issue emergency bonds” is selected, not enacted/);
        assert.doesNotMatch(line, /turn 2’s “Issue emergency bonds”/);
    }
    const second = resolveTurn(chosen);
    assert.match(say(defense, second), /turn 1’s “Expand public services” directly applied Stability \+4/);
    assert.match(say(press, second), /turn 1’s “Expand public services” directly applied Public Approval \+9/);
    assert.match(say(chief, second), /turn 2’s “Issue emergency bonds” directly applied Treasury \+18/);
    assert.match(say(finance, second), /Debt \+18/);
});

test('phase objectives follow the real selection and settlement state for all remaining officials', () => {
    const initial = createInitialState();
    const selectedResponse = selectResponse(initial, 'absorb');
    const policy = beginPolicyPhase(selectedResponse);
    const chosen = selectPolicy(policy, 'cuts');
    const report = resolveTurn(chosen);
    for (const npc of remaining) {
        const topic = objectiveTopic(npc);
        assert.match(say(npc, initial, topic), /Economic slowdown.*choose a response/);
        assert.match(say(npc, selectedResponse, topic), /response has been selected: “Absorb the downturn”/);
        assert.match(say(npc, policy, topic), /Choose a policy at the National Policy Desk/);
        assert.match(say(npc, chosen, topic), /“Cut discretionary spending” is selected, not enacted/);
        assert.equal(Object.fromEntries(getNpcDialogue(npc, chosen, topic).figures).Destination, 'National Policy Desk');
        assert.match(say(npc, report, topic), /Turn 1 has settled.*Cabinet Briefing Table/);
        assert.doesNotMatch(say(npc, report, topic), /is selected, not enacted/);
    }
});

test('selected forecasts remain distinct from current readings and flag projected portfolio failures', () => {
    const initial = createInitialState();
    initial.meters.stability = 9;
    const chosen = choose(initial, 'absorb', 'cuts');
    const saved = structuredClone(chosen);
    const answer = getNpcDialogue(defense, chosen);
    assert.match(answer.figures[0][1], /^9\/100/);
    assert.match(answer.message, /Selected choices project Stability 0, International Standing 60.*not settled.*Stability would reach zero/);
    assert.match(say(press, chosen), /Selected choices project Public Approval 46, Donor Confidence 60/);
    assert.deepEqual(chosen, saved);
});

test('improving completed turns are acknowledged without confusing improvement with policy effects', () => {
    const state = createInitialState();
    state.meters.treasury = 60;
    const report = settle(state, 'relief', 'services');
    assert.match(say(chief, report), /Treasury fell/); // Treasury fell while support improved.
    assert.match(say(defense, report), /Stability rose 4.*measurable progress/);
    assert.match(say(press, report), /Public Approval rose 15.*lectern/);
    assert.match(say(press, report), /directly applied Public Approval \+9.*full turn changed Public Approval \+15/);
    const fundedRelief = settle(createInitialState(), 'relief', 'bonds');
    assert.match(say(aide, fundedRelief), /rose 6.*encouraging news/);
    assert.match(say(defense, fundedRelief), /“Issue emergency bonds” had no direct change to the figures I monitor/);
});

test('every ending has a distinct personal response in both report and result phases', () => {
    const report = settle(createInitialState(), 'absorb', 'cuts');
    const endings = [
        ['reelected', /[Ww]on re-election|Re-election gives/],
        ['election-lost', /[Ww]e lost the election/],
        ['survived', /[Ww]e survived the first 90 days/],
        ['collapsed', /government has collapsed/]
    ];
    for (const [outcome, ending] of endings) {
        for (const phase of ['report', 'result']) {
            const state = { ...report, outcome, phase };
            const messages = new Set();
            for (const npc of everyone) {
                const saved = structuredClone(state);
                const answer = getNpcDialogue(npc, state);
                assert.match(answer.message, ending);
                assert.match(answer.message, /Final figures:/);
                assert.match(answer.message, /Cut discretionary spending/);
                assert.doesNotMatch(answer.message, /choose a response|before approval|before advancing/);
                assert.equal(answer.alert?.title, outcome === 'collapsed' ? 'Government collapse' : undefined);
                assert.match(say(npc, state, objectiveTopic(npc)), ending);
                for (const topic of npc.topics.filter(id => ['condition', 'security', 'foreign', 'confidence', 'reputation', 'notices'].includes(id))) {
                    assert.match(say(npc, state, topic), ending);
                }
                if (outcome === 'collapsed') assert.deepEqual(answer.topics, []);
                messages.add(answer.message);
                assert.deepEqual(state, saved);
            }
            assert.equal(messages.size, everyone.length);
        }
    }
});

test('all failed meters remain visible in collapse alongside the official’s personal response', () => {
    const state = settle(createInitialState(), 'relief', 'services');
    const collapsed = settle(advanceTurn(state), 'settlement', 'regulations');
    collapsed.meters.stability = 0;
    for (const npc of everyone) {
        const answer = getNpcDialogue(npc, collapsed);
        assert.match(answer.message, /Treasury, Stability reached zero/);
        assert.deepEqual(answer.figures, [['Treasury', '0/100'], ['Stability', '0/100']]);
    }
});

test('reading every topic in every active phase is deterministic and leaves state untouched', () => {
    const initial = createInitialState();
    const chosen = choose(initial, 'absorb', 'cuts');
    const report = resolveTurn(chosen);
    for (const state of [initial, chosen, report, advanceTurn(report)]) {
        const saved = structuredClone(state);
        for (const npc of everyone) {
            for (const topic of npc.topics) {
                const first = getNpcDialogue(npc, state, topic);
                assert.deepEqual(getNpcDialogue(npc, state, topic), first);
                assert.ok(first.message.length > 0);
                assert.doesNotMatch(first.message, /undefined|NaN/);
            }
        }
        assert.deepEqual(state, saved);
    }
});
