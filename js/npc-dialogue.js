import { METERS, getScenario } from './content.js';
import { calculateTurn, forecastBudget } from './engine.js';
import { governmentWarning, meterWarningSeverity, treasuryPaymentsDueSoon, treasuryWarning } from './office-alerts.js';
import { getPresidentialObjective } from './office-objectives.js';

const meterNames = Object.fromEntries(METERS.map(({ id, label }) => [id, label]));
const signed = amount => amount > 0 ? `+${amount}` : String(amount);
const phaseNames = { event: 'Event briefing', policy: 'Policy review', report: 'Cabinet report', result: 'Final results' };

function meterReading(state, id) {
    const value = state.meters[id];
    const previous = state.history.at(-1)?.startMeters[id];
    const change = previous === undefined ? 0 : value - previous;
    const severity = meterWarningSeverity(value);
    const condition = severity === 'critical' ? 'Critical'
        : severity === 'warning' ? 'Low'
            : change < 0 ? 'Declining' : 'Healthy';
    return `${value}/100 · ${condition}${change ? ` · ${signed(change)} in turn ${state.history.at(-1).turn}` : ''}`;
}

function outlook(state, ids, message) {
    return { message, figures: ids.map(id => [meterNames[id], meterReading(state, id)]) };
}

function treasuryBriefing(state) {
    const settled = state.phase === 'report' || state.phase === 'result';
    const report = settled ? state.history.at(-1) : null;
    const projection = state.phase === 'policy' && state.selectedPolicyId ? calculateTurn(state) : null;
    const budget = (report ?? projection ?? forecastBudget(state, state.turn)).budget;
    const message = report ? `The Cabinet has settled the budget for turn ${state.turn}.`
        : projection ? `Here is the projected budget for turn ${state.turn}, including your selected response and policy.`
            : `Here is the baseline budget for turn ${state.turn}, before this turn’s decisions.`;

    return {
        message,
        figures: [
            ['Treasury', meterReading(state, 'treasury')],
            ['Economy', meterReading(state, 'economy')],
            ['Debt', state.debt],
            ['Tax revenue', budget.revenue],
            ['Essential spending', budget.spending],
            ['Debt interest', budget.interest],
            ['Scheduled payments', budget.commitments],
            ['Net budget', signed(budget.total)],
            ...(projection ? [['Projected Treasury', projection.meters.treasury]] : [])
        ]
    };
}

function paymentsBriefing(state) {
    const groups = new Map(treasuryPaymentsDueSoon(state));
    const entries = [state.turn, state.turn + 1].map(turn => {
        const current = turn === state.turn;
        const effects = groups.get(turn);
        const title = `${current ? 'This turn' : 'Next turn'} · Turn ${turn}`;
        if (effects) {
            const details = effects.map(effect => `${effect.source} · ${-effect.amount} Treasury`);
            const total = effects.reduce((sum, effect) => sum - effect.amount, 0);
            return { title, text: `${details.join(', ')}. Total due is ${total} Treasury.` };
        }
        const text = current && (state.phase === 'report' || state.phase === 'result')
            ? 'This turn’s budget has already settled.'
            : state.outcome || turn > getScenario(state.mode).turns
                ? 'There is no further budget settlement in this run.'
                : 'No payments are due.';
        return { title, text };
    });
    return { message: 'These are scheduled Treasury payments from decisions already on record.', entries };
}

function debtBriefing(state) {
    const report = state.history.at(-1);
    const change = report ? report.debt - report.startDebt : 0;
    const higherFees = getScenario(state.mode).events.some(event => event.responses.some(response =>
        (response.debtRule && state.debt >= response.debtRule.threshold) ||
        response.conditions?.some(rule => rule.metric === 'debt' && rule.comparison === 'gte' && state.debt >= rule.threshold)
    ));
    return {
        message: higherFees
            ? 'Debt at this level can increase financing costs during some events.'
            : 'Outstanding debt adds interest to each budget settlement.',
        figures: [
            ['National Debt', state.debt],
            ['Interest at current debt', forecastBudget(state, state.turn).budget.interest],
            ...(report ? [['Debt change last turn', signed(change)]] : [])
        ]
    };
}

function decisionBriefing(state, npc) {
    const entries = state.history.slice(-3).reverse().map(report => {
        const policyEffects = [];
        const settledChanges = [];
        for (const id of npc.monitors) {
            const label = meterNames[id] ?? 'Debt';
            const direct = id === 'debt' ? report.newDebt : report.contributions[id]
                .filter(effect => effect.type === 'policy').reduce((total, effect) => total + effect.amount, 0);
            const settled = id === 'debt' ? report.debt - report.startDebt : report.meters[id] - report.startMeters[id];
            if (direct) policyEffects.push(`${label} ${signed(direct)}`);
            if (settled) settledChanges.push(`${label} ${signed(settled)}`);
        }
        const scheduled = npc.monitors.includes('treasury') ? report.newScheduled
            .filter(effect => effect.sourceType === 'policy' && effect.meter === 'treasury' && effect.amount < 0)
            .map(effect => `${-effect.amount} Treasury on turn ${effect.dueTurn}`) : [];
        const text = [
            policyEffects.length ? `The policy directly applied ${policyEffects.join(', ')}.` : '',
            scheduled.length ? `The policy also scheduled payments of ${scheduled.join(', ')}.` : '',
            settledChanges.length ? `The full turn ended with changes of ${settledChanges.join(', ')}.` : ''
        ].filter(Boolean).join(' ');
        return {
            title: `Turn ${report.turn} · ${report.policyTitle}`,
            text: text || 'The records show no change to the figures I monitor.'
        };
    });
    return {
        message: entries.length ? 'Here is what the completed turn records show.' : 'There are no completed turns to review yet.',
        entries
    };
}

function objectiveBriefing(state) {
    const { title, description, location } = getPresidentialObjective(state);
    return {
        message: description,
        figures: [['Current objective', title], ['Destination', location]]
    };
}

const topics = {
    condition: ['Government condition', (state, npc) =>
        outlook(state, npc.monitors, 'These are the current readings across the government.')],
    objective: ['Current objective', objectiveBriefing],
    treasury: ['Discuss Treasury', treasuryBriefing],
    payments: ['Review Upcoming Payments', paymentsBriefing],
    debt: ['Discuss National Debt', debtBriefing],
    security: ['National security', state =>
        outlook(state, ['stability', 'international'], state.meters.stability < 30
            ? 'Low Stability can increase the cost of responding to a disruption. Review the National Security station for the current assessment.'
            : 'The National Security station has our current readiness assessment.')],
    foreign: ['Foreign tensions', state =>
        outlook(state, ['international', 'stability'], ['event', 'policy'].includes(state.phase) && state.currentEvent?.category.startsWith('International')
            ? `The current international briefing is ${state.currentEvent.title}.`
            : 'International Standing tracks Arden’s diplomatic position. The Strategic Map shows the current regional outlook.')],
    confidence: ['Public confidence', state =>
        outlook(state, ['approval'], 'Public Approval shows how the electorate is responding.')],
    reputation: ['Government reputation', state =>
        outlook(state, ['approval', 'donors'], 'Public support and donor confidence show how the government is regarded.')],
    decisions: ['Recent decisions', decisionBriefing],
    directions: ['Ask for directions', () => ({
        message: 'The Cabinet Room is on the left, the Executive Office is in the center, and the Press Briefing Room is on the right. Take the south passage to reach the Situation Room.'
    })],
    meeting: ['Meeting reminders', objectiveBriefing],
    notices: ['Government notices', state => {
        const payment = treasuryWarning(state);
        return {
            message: state.phase === 'event' ? `The current briefing is ${state.currentEvent.title}.`
                : getPresidentialObjective(state).description,
            entries: payment?.severity === 'normal' ? [{ title: 'Treasury schedule', text: payment.message }] : []
        };
    }]
};

export function getNpcDialogue(npc, state, requestedTopic) {
    if (!state) {
        const answer = npc.topics.includes('directions') ? topics.directions[1]()
            : { message: 'Start or resume a run to review the government’s current affairs.' };
        return { ...answer, topics: [] };
    }

    const phase = `Turn ${state.turn} · ${phaseNames[state.phase]}`;
    if (state.outcome === 'collapsed') {
        const alert = governmentWarning(state);
        const failures = METERS.filter(meter => state.meters[meter.id] === 0);
        return {
            phase, alert, topics: [],
            message: failures.length ? `${failures.map(meter => meter.label).join(', ')} reached zero.`
                : 'The administration has reached a critical outcome.',
            figures: failures.map(meter => [meter.label, '0/100'])
        };
    }

    const payment = treasuryWarning(state);
    const nextPayment = payment?.dueTurn === state.turn ? treasuryWarning(state, state.turn + 1) : null;
    const alerts = [payment, nextPayment];
    const alert = alerts.find(item => item?.severity === 'critical')
        ?? alerts.find(item => item?.severity === 'urgent')
        ?? governmentWarning(state, npc.monitors.length ? npc.monitors : undefined);
    const selected = npc.topics.includes(requestedTopic) ? requestedTopic : npc.topics[0];
    return {
        phase, alert, selected,
        topics: npc.topics.map(id => ({ id, label: topics[id][0] })),
        ...topics[selected][1](state, npc)
    };
}
