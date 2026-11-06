import { calculateTurn, forecastBudget } from './engine.js';

function financeBriefing(state) {
    if (!state) {
        return { message: 'Start or resume a run and I can brief you on the Treasury and its commitments.' };
    }

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
            ['Treasury', state.meters.treasury],
            ['Debt', state.debt],
            ['Tax revenue', budget.revenue],
            ['Essential spending', budget.spending],
            ['Debt interest', budget.interest],
            ['Scheduled payments', budget.commitments],
            ['Net budget', budget.total > 0 ? `+${budget.total}` : budget.total]
        ]
    };
}

// Each room lists its staff. Foot origins are in source-frame pixels.
const roomNpcs = {
    GovernmentCorridorScene: [{
        action: 'npc-chief-of-staff',
        name: 'Chief of Staff',
        hint: 'Ask about your next objective.',
        asset: './assets/chief_of_staff.png',
        frameWidth: 256, frameHeight: 384, footY: 378, scale: 0.22,
        x: 270, y: 370, direction: 'down',
        talkRadius: 85, collisionRadius: 32,
        briefing: () => ({
            message: 'The administration is at work, President. Check your Current Objective panel for your next government responsibility.'
        })
    }],
    CabinetRoomScene: [{
        action: 'npc-finance-secretary',
        name: 'Finance Secretary',
        hint: 'Ask for a budget update.',
        asset: './assets/finance_secretary.png',
        frameWidth: 256, frameHeight: 384, footY: 340, scale: 0.22,
        x: 555, y: 520, direction: 'down',
        talkRadius: 85, collisionRadius: 30,
        briefing: financeBriefing
    }]
};

export function getRoomNpcs(roomKey) {
    return roomNpcs[roomKey] ?? [];
}
