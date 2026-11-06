import { METERS, getScenario } from './content.js';
import { forecastBudget, getEvent, getPolicies } from './engine.js';

const meterLabels = Object.fromEntries(METERS.map(meter => [meter.id, meter.label]));
const signed = amount => amount > 0 ? `+${amount}` : String(amount);
const entry = (title, text) => ({ title, text });
const nextActions = {
    event: { id: 'advisors', label: 'Choose an event response' },
    policy: { id: 'national-policies', label: 'Open the Policy Dossier' },
    report: { id: 'cabinet-briefing', label: 'Review the Cabinet Report' },
    result: { id: 'final-results', label: 'View Final Results' }
};

function responseEntries(state, event) {
    return event.responses.map(response => {
        const effects = Object.entries(response.effects)
            .filter(([, amount]) => amount !== 0)
            .map(([meter, amount]) => `${meterLabels[meter]} ${signed(amount)}`);
        const selected = state.selectedResponseId === response.id ? ' (selected)' : '';
        return entry(response.title + selected, [response.description, effects.join(' · ')].filter(Boolean).join(' '));
    });
}

function policiesInHand(state, meter) {
    return getPolicies(state)
        .filter(policy => state.hand.includes(policy.id) && policy.effects[meter])
        .map(policy => entry(policy.title, `${meterLabels[meter]} ${signed(policy.effects[meter])}. ${policy.consequence}`));
}

function regionalOutlook(state, region) {
    if (region === 'partners') {
        return {
            title: 'Regional Partners',
            description: 'Track diplomatic standing and coalition support in Arden’s external relationships.',
            meters: ['international', 'donors']
        };
    }
    if (region === 'supply') {
        const settled = state.phase === 'report' || state.phase === 'result';
        const budget = forecastBudget(state, state.turn + Number(settled));
        return {
            title: 'Supply Routes',
            description: 'Review the fiscal capacity supporting trade and government commitments.',
            meters: ['treasury', 'economy'],
            entries: [entry(`Turn ${budget.targetTurn} budget baseline`,
                `Revenue ${budget.budget.revenue} · Scheduled payments ${budget.budget.commitments} · Net ${signed(budget.budget.total)} before new decisions.`)]
        };
    }
    return {
        title: 'Republic of Arden',
        description: 'Monitor domestic stability and public support across Arden.',
        meters: ['stability', 'approval']
    };
}

export function getSituationBriefing(state, section, region) {
    if (!state) {
        return { title: 'Awaiting a government', description: 'Start or resume a run to load live Situation Room briefings.' };
    }

    const pending = state.phase === 'event' || state.phase === 'policy';
    const event = pending ? getEvent(state) : null;
    const action = nextActions[state.phase];
    const metrics = ids => ids.map(id => ({ label: meterLabels[id], value: state.meters[id] }));

    switch (section) {
        case 'map': {
            const { meters, ...outlook } = regionalOutlook(state, region);
            return { ...outlook, metrics: metrics(meters) };
        }
        case 'diplomacy': {
            const externalEvent = event?.category.startsWith('International') ? event : null;
            const options = pending ? policiesInHand(state, 'international') : [];
            return {
                title: 'Diplomatic desk',
                description: externalEvent?.description ?? 'Monitor foreign relations and review options from the current policy hand.',
                metrics: metrics(['international', 'donors']),
                entries: [
                    ...(externalEvent ? [entry('Current diplomatic briefing', externalEvent.title)] : []),
                    ...options
                ],
                action: state.phase === 'policy' || (externalEvent && state.phase === 'event') ? action : null
            };
        }
        case 'intelligence': {
            const scenario = getScenario(state.mode);
            const conditions = state.nationConditions
                .filter(item => item.startTurn <= state.turn && item.lastTurn >= state.turn)
                .map(item => {
                    const definition = scenario.nationConditions.find(condition => condition.id === item.conditionId);
                    return entry(definition.title, `${definition.description} Active through turn ${item.lastTurn}.`);
                });
            const findings = event?.responses.filter(response => response.condition)
                .map(response => entry(response.title, response.condition)) ?? [];
            const reviews = state.reviewReservations.map(review => {
                const definition = scenario.reviews.find(item => item.id === review.reviewId);
                return entry(`Scheduled review · Turn ${review.reservedTurn}`, definition.title);
            });
            const entries = [...findings, ...conditions, ...reviews];
            return {
                title: 'Intelligence assessment',
                description: event ? `Verified information for ${event.title}.` : 'Verified conditions and reviews on the government record.',
                entries: entries.length ? entries : [entry('No additional findings', 'The current record has no special response conditions, active conditions, or scheduled reviews.')]
            };
        }
        case 'security':
            return {
                title: 'National security assessment',
                description: state.meters.stability < 30
                    ? 'Stability is below 30. Events with disruption rules can carry additional costs.'
                    : 'Monitor domestic stability and review policies that affect preparedness and civil order.',
                metrics: metrics(['stability', 'treasury']),
                entries: pending ? policiesInHand(state, 'stability') : [],
                action: state.phase === 'policy' ? action : null
            };
        default: {
            const report = state.history.at(-1);
            return {
                title: event?.title ?? report?.eventTitle ?? 'Emergency briefing',
                description: event?.description ?? `Turn ${state.turn} decisions are on the government record.`,
                metrics: metrics(['treasury', 'stability']),
                entries: event ? responseEntries(state, event) : report ? [
                    entry(report.responseTitle, `Policy enacted: ${report.policyTitle}.`),
                    ...report.failures.map(failure => entry(failure.label, failure.failure))
                ] : [],
                action
            };
        }
    }
}
