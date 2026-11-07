import { getScenario } from './content.js';
import { calculateTurn, forecastBudget } from './engine.js';
import { treasuryPaymentsDueSoon } from './office-alerts.js';
import { getPresidentialObjective } from './office-objectives.js';

export function debtFinancingThreshold(state) {
    const thresholds = getScenario(state.mode).events.flatMap(event => event.responses.flatMap(response => [
        ...(response.debtRule ? [response.debtRule.threshold] : []),
        ...(response.conditions ?? []).filter(rule => rule.metric === 'debt' && rule.comparison === 'gte')
            .map(rule => rule.threshold)
    ]));
    return Math.min(...thresholds);
}

function financeContext(state) {
    const projection = state.phase === 'policy' && state.selectedPolicyId ? calculateTurn(state) : null;
    const targetTurn = state.phase === 'report' ? state.turn + 1 : state.turn;
    const forecast = !state.outcome && targetTurn <= getScenario(state.mode).turns
        ? projection ?? forecastBudget(state, targetTurn) : null;
    const remaining = forecast ? (projection ? projection.rawMeters.treasury : forecast.rawTreasury) : null;
    const basis = projection ? 'With your selected response and policy'
        : state.phase === 'report' ? 'Before any new decisions next turn'
            : 'Before counting this turn’s response and policy';
    const payments = treasuryPaymentsDueSoon(state).map(([turn, effects]) => ({
        turn,
        total: effects.reduce((sum, effect) => sum - effect.amount, 0),
        timing: turn === state.turn ? 'this turn' : 'next turn'
    }));
    const atRisk = payments.find(payment => state.meters.treasury - payment.total <= 0);
    const tight = payments.find(payment => state.meters.treasury - payment.total <= 10);
    return {
        state, remaining, basis, targetTurn, payments, atRisk, tight,
        treasury: state.meters.treasury,
        debt: state.debt,
        interest: Math.ceil(state.debt * 0.05),
        highDebt: state.debt >= debtFinancingThreshold(state)
    };
}

// Ordered within each category: the most pressing applicable entry wins.
// The Secretary is meticulous, protective of reserves, and quietly wry.
const financeLines = {
    critical: [
        {
            when: c => c.remaining !== null && c.remaining <= 0,
            say: c => `${c.basis}, the Treasury forecast for turn ${c.targetTurn} is ${c.remaining} before the zero floor. That would exhaust our funds. I can balance a ledger, President; I cannot pay a bill with an empty vault. Restore a positive forecast before approval.`
        },
        {
            when: c => c.treasury <= 10,
            say: c => `Treasury is down to ${c.treasury}. That is emergency territory, not a cushion. My pencil is worn to a stump: protect the remaining funds and check the full budget before making another promise.`
        },
        {
            when: c => Boolean(c.atRisk),
            say: c => `We have ${c.treasury} Treasury, and ${c.atRisk.total} in scheduled payments due ${c.atRisk.timing}, on turn ${c.atRisk.turn}. Those bills alone leave no reserve before other turn effects. Dates in my ledger do not move because a speech went well. Review Upcoming Payments and secure room to pay.`
        }
    ],
    warning: [
        {
            when: c => Boolean(c.tight),
            say: c => `Scheduled payments of ${c.tight.total} arrive ${c.tight.timing}, on turn ${c.tight.turn}. Against our ${c.treasury} Treasury, that leaves only ${c.treasury - c.tight.total} before other turn effects. I have underlined the date twice. Keep a reserve before adding commitments.`
        },
        {
            when: c => c.treasury <= 20 || (c.remaining !== null && c.remaining <= 20),
            say: c => `We hold ${c.treasury} Treasury.${c.remaining !== null ? ` ${c.basis}, turn ${c.targetTurn} would leave ${c.remaining}.` : ''} There is little room for surprises. I prefer surprises on birthdays; keep the next decision affordable.`
        },
        {
            when: c => c.highDebt,
            say: c => `Debt stands at ${c.debt}, with ${c.interest} Treasury in interest each turn at that balance. We have reached a level that can add financing costs in some events. Borrowing buys time, President, and time sends invoices. Review debt before borrowing again.`
        }
    ],
    normal: [
        {
            when: c => c.payments.length > 0,
            say: c => `Treasury stands at ${c.treasury}; our next scheduled payments total ${c.payments[0].total}, due ${c.payments[0].timing} on turn ${c.payments[0].turn}. Current funds leave a reserve against those bills before other turn effects. The dates are in order. A pleasantly uneventful sentence, in my profession.`
        },
        {
            when: c => c.debt > 0,
            say: c => `We have ${c.treasury} Treasury and ${c.debt} debt. Interest at that balance is ${c.interest} per turn. There are no scheduled payments due this turn or next within the remaining run. We have breathing room; I would rather spend it thinking than borrowing.`
        },
        {
            when: () => true,
            say: c => `Treasury is ${c.treasury}, debt is zero, and there are no scheduled payments due this turn or next within the remaining run. The books are orderly. I might even let my tea go cold for a reason other than worry.`
        }
    ],
    objective: [
        {
            when: c => c.state.phase === 'event',
            say: c => c.state.selectedResponseId
                ? 'Your response is selected. Finish the Chief of Staff briefing, then bring the policy figures to the National Policy Desk. I like to see the whole bill before anyone signs it.'
                : `First, hear the Chief of Staff briefing on “${c.state.currentEvent.title}” and choose a response. Keep our ${c.treasury} Treasury in mind. The event may be unexpected; its price should not be.`
        },
        {
            when: c => c.state.phase === 'policy',
            say: c => c.state.selectedPolicyId
                ? `Review the selected policy at the National Policy Desk. ${c.basis}, Treasury would finish turn ${c.targetTurn} at ${c.remaining} before the zero floor. ${c.remaining <= 0 ? 'Revise the choice before approval; this forecast exhausts our funds.' : 'Check the other meters and future payments before approval.'} My signature is small; my reservations rarely are.`
                : 'Choose a policy at the National Policy Desk and check its combined forecast with your response, debt interest, and payments. An attractive headline is not a budget, though people keep submitting them to me.'
        },
        {
            when: () => true,
            say: c => c.state.outcome
                ? `The final accounts show ${c.treasury} Treasury and ${c.debt} debt. ${getPresidentialObjective(c.state).description} Future obligations remain part of the legacy. I leave the ledger open, even when the term is closed.`
                : `Review the settled figures at the Cabinet Briefing Table before advancing. We ended turn ${c.state.turn} with ${c.treasury} Treasury and ${c.debt} debt. I have filed the receipts; next turn will bring its own.`
        }
    ]
};

export function financeCondition(state) {
    if (state.outcome) return financeObjective(state);
    const context = financeContext(state);
    const line = [...financeLines.critical, ...financeLines.warning, ...financeLines.normal]
        .find(entry => entry.when(context));
    return { message: line.say(context) };
}

export function financeObjective(state) {
    const context = financeContext(state);
    const line = financeLines.objective.find(entry => entry.when(context));
    const objective = getPresidentialObjective(state);
    return {
        message: line.say(context),
        figures: [['Current objective', objective.title], ['Destination', objective.location]]
    };
}
