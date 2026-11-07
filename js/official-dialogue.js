import { METERS, getScenario } from './content.js';
import { calculateTurn } from './engine.js';
import { treasuryWarning } from './office-alerts.js';
import { getPresidentialObjective } from './office-objectives.js';

const labels = Object.fromEntries(METERS.map(meter => [meter.id, meter.label]));
const signed = value => value > 0 ? `+${value}` : String(value);
const roleOf = npc => npc.action.replace('npc-', '');

function contextFor(state, npc) {
    const readings = npc.monitors.filter(id => id !== 'debt')
        .map(id => ({ id, value: state.meters[id], label: labels[id] }));
    const lowest = [...readings].sort((a, b) => a.value - b.value)[0];
    const report = state.history.at(-1);
    const changes = report ? readings.map(reading => ({ ...reading,
        change: report.meters[reading.id] - report.startMeters[reading.id]
    })) : [];
    const decline = [...changes].sort((a, b) => a.change - b.change).find(item => item.change < 0);
    const improvement = [...changes].sort((a, b) => b.change - a.change).find(item => item.change > 0);
    const scenario = getScenario(state.mode);
    const payments = [treasuryWarning(state, state.turn), treasuryWarning(state, state.turn + 1)];
    const payment = payments.find(item => item?.severity === 'critical')
        ?? payments.find(item => item?.severity === 'urgent');
    return { state, ...state.meters, lowest, decline, improvement, payment,
        electionTarget: scenario.electionTarget,
        electionSoon: scenario.electionTarget !== null && scenario.turns - state.turn <= 2 };
}

const improved = c => `${c.improvement.label} rose ${c.improvement.change} in the completed turn ${c.state.history.at(-1).turn}`;
const declined = c => `${c.decline.label} fell ${-c.decline.change} in the completed turn ${c.state.history.at(-1).turn}`;
const lowReading = c => `${c.lowest.label} is ${c.lowest.value}/100`;

// Each official has twelve entries: two critical, three warning, three normal,
// three phase objectives, and one outcome entry with a distinct line per ending.
const officials = {
    'chief-of-staff': {
        critical: [
            { when: c => c.lowest.value <= 10,
                say: c => `${lowReading(c)}. This is a government crisis. Put that portfolio at the top of the agenda; a tidy schedule is useless if the administration cannot survive it.` },
            { when: c => c.payment?.severity === 'critical',
                say: c => `The Finance Secretary has flagged a payment crisis. ${c.payment.message} See them before committing the government. I can rearrange meetings; I cannot rearrange a payment deadline.` }
        ],
        warning: [
            { when: c => c.lowest.value <= 20,
                say: c => `${lowReading(c)}. We are running short of room to govern. Address the weak portfolio before adding another ambition to my list.` },
            { when: c => c.electionSoon && c.approval < c.electionTarget,
                say: c => `Approval is ${c.approval}, below the election target of ${c.electionTarget}, with ${getScenario(c.state.mode).turns - c.state.turn + 1} turn settlements remaining. We need results people can feel. I have pencilled in victory; pencil can be erased.` },
            { when: c => Boolean(c.decline),
                say: c => `${declined(c)}. The government still has options, but that direction deserves attention. I keep the awkward figures on the first page so nobody can lose them.` }
        ],
        normal: [
            { when: c => Boolean(c.improvement),
                say: c => `${improved(c)}. That is useful progress. Keep an eye on the weaker portfolios; success in one ministry tends to make the others request a meeting.` },
            { when: c => c.approval >= 60 && c.stability >= 60,
                say: c => `Approval is ${c.approval} and Stability is ${c.stability}. We have public backing and room to work. I would like to use this rare interval to finish something already on the agenda.` },
            { when: () => true,
                say: c => `The weakest portfolio is ${c.lowest.label} at ${c.lowest.value}/100, above the warning line. The government has working room. My calendar is less comfortable, but that is a separate crisis.` }
        ],
        objective: [
            { when: c => c.state.phase === 'event', say: () => 'Settle the briefing first; the rest of the agenda depends on your response.' },
            { when: c => c.state.phase === 'policy', say: () => 'Check the whole government forecast. A ministry can win its argument while the country loses the turn.' },
            { when: () => true, say: () => 'Review the Cabinet record before moving on. I would rather answer a difficult question here than repeat the mistake next turn.' }
        ],
        outcome: {
            reelected: 'We won re-election. I will allow myself one satisfied breath before the next agenda. The mandate is renewed; the record still deserves scrutiny.',
            'election-lost': 'We lost the election. Prepare an orderly handover and keep the record intact. The voters have changed the agenda, and we will respect it.',
            survived: 'We survived the first 90 days. I have crossed off the opening crises; I have not mistaken that for solving every problem.',
            collapsed: 'The government has collapsed. Preserve the Cabinet record. My last duty is to make sure the next administration can see where this one failed.'
        }
    },
    'defense-secretary': {
        critical: [
            { when: c => c.stability <= 10,
                say: c => `Stability is ${c.stability}/100. Our institutions are close to being overwhelmed. Prioritize restoring order. I prefer a quiet readiness report; this one is neither quiet nor reassuring.` },
            { when: c => c.international <= 10,
                say: c => `International Standing is ${c.international}/100. We are close to diplomatic isolation. Restore external cooperation before another confrontation. Pride is a poor supply line.` }
        ],
        warning: [
            { when: c => c.stability < 30,
                say: c => `Stability is ${c.stability}/100, below the disruption threshold of 30. Some emergency and worker responses can become more costly. Strengthen domestic capacity; readiness is built before the telephone rings.` },
            { when: c => c.international <= 20,
                say: c => `International Standing is ${c.international}/100. Our diplomatic margin is thin. Review the Strategic Map and consider the price of another strained relationship.` },
            { when: c => Boolean(c.decline),
                say: c => `${declined(c)}. We still have room to act, but I want that trend reversed. A warning is most useful while it still sounds overly cautious.` }
        ],
        normal: [
            { when: c => Boolean(c.improvement),
                say: c => `${improved(c)}. The position has strengthened. I will take measurable progress over a stirring speech every time.` },
            { when: c => c.stability >= 60 && c.international >= 60,
                say: c => `Stability and International Standing are ${c.stability} and ${c.international}. Our domestic and diplomatic positions give us room to respond. A quiet situation room is the result I work for.` },
            { when: () => true,
                say: c => `Stability is ${c.stability}; International Standing is ${c.international}. Neither is at its warning threshold. Maintain both. I have little use for a strong front door and no friends beyond it.` }
        ],
        objective: [
            { when: c => c.state.phase === 'event', say: () => 'Assess the response for domestic disruption and external consequences. The Situation Room stations have the current assessment.' },
            { when: c => c.state.phase === 'policy', say: () => 'Compare the policy forecast for Stability and International Standing. Preparation earns its keep before the next emergency.' },
            { when: () => true, say: () => 'Check the settled security figures at the Cabinet Briefing Table. A plan and its outcome belong in separate columns.' }
        ],
        outcome: {
            reelected: 'Re-election gives us another mandate. Preserve institutional readiness and external relationships; neither renews automatically with a ballot.',
            'election-lost': 'We lost the election. Prepare the security handover. The institutions serve the country through a change of government.',
            survived: 'We survived the first 90 days. The immediate watch is over. I would call that a successful watch, not a permanent all-clear.',
            collapsed: 'The government has collapsed. Record the failures plainly. A readiness assessment that hides bad news is of no use to whoever follows us.'
        }
    },
    'press-secretary': {
        critical: [
            { when: c => c.approval <= 10,
                say: c => `Public Approval is ${c.approval}/100. We are close to losing our mandate. Give people a concrete reason to trust us. I can explain a decision; I cannot manufacture its results.` },
            { when: c => c.donors <= 10,
                say: c => `Donor Confidence is ${c.donors}/100. Coalition funding is close to collapse. Address the governing support behind our promises. A full press room cannot substitute for a functioning coalition.` }
        ],
        warning: [
            { when: c => c.lowest.value <= 20,
                say: c => `${lowReading(c)}. Support is fragile. We need a credible decision before a confident announcement; my nicest microphone cannot improve those numbers.` },
            { when: c => c.electionTarget !== null && c.approval < c.electionTarget,
                say: c => `Approval is ${c.approval}, below the election target of ${c.electionTarget}. The election is decided after the final settlement, so this is a warning, not a result. Give me something useful to explain to households.` },
            { when: c => Boolean(c.decline),
                say: c => `${declined(c)}. People notice when their experience and our statement diverge. Let us fix the experience before polishing the statement.` }
        ],
        normal: [
            { when: c => Boolean(c.improvement),
                say: c => `${improved(c)}. That is a figure I can take to the lectern without clearing my throat first. Let the results carry the message.` },
            { when: c => c.approval >= 60 && c.donors >= 60,
                say: c => `Approval is ${c.approval}; Donor Confidence is ${c.donors}. We have public and coalition support to work with. I would like to spend one briefing answering questions instead of extinguishing headlines.` },
            { when: () => true,
                say: c => `Approval is ${c.approval} and Donor Confidence is ${c.donors}. We have room to make our case, though I would keep the victory adjectives in the drawer.` }
        ],
        objective: [
            { when: c => c.state.phase === 'event', say: () => 'Decide the response before I describe our position. I would prefer the headline to follow the decision for once.' },
            { when: c => c.state.phase === 'policy', say: () => 'Review Approval and Donor Confidence together. I need an honest account of the tradeoff, not just the most flattering number.' },
            { when: () => true, say: () => 'Use the Cabinet results for the next statement. Proposed benefits and delivered results are different stories.' }
        ],
        outcome: {
            reelected: 'We won re-election. That is a headline I do not need to soften. Thank the voters, and keep the final record beside the celebration.',
            'election-lost': 'We lost the election. The statement should acknowledge the verdict and the handover. No amount of punctuation turns a defeat into a mandate.',
            survived: 'We survived the first 90 days. A respectable headline. I will resist adding “mission accomplished” to it.',
            collapsed: 'The government has collapsed. We owe the public a plain account of what failed. Today, clarity matters more than a reassuring tone.'
        }
    },
    'government-aide': {
        critical: [
            { when: c => c.lowest.value <= 10,
                say: c => `${lowReading(c)}. I have marked the government notices as urgent. Please address that before the routine appointments; I can keep the corridor clear.` },
            { when: c => c.payment?.severity === 'critical',
                say: c => `An urgent Treasury notice has arrived. ${c.payment.message} The Finance Secretary is in the Cabinet Room. I have put that folder on top, where even I cannot misplace it.` }
        ],
        warning: [
            { when: c => c.lowest.value <= 20,
                say: c => `${lowReading(c)}. I have flagged it in the notices. The paper is only yellow for now; I would very much like to keep it that way.` },
            { when: c => c.payment?.severity === 'urgent',
                say: c => `The Treasury schedule needs attention. ${c.payment.message} Please check with the Finance Secretary. My filing system allows for surprises; the payment calendar seems less flexible.` },
            { when: c => Boolean(c.decline),
                say: c => `${declined(c)}. I have carried that figure into the current notices. Old folders can leave the desk; old consequences tend to stay.` }
        ],
        normal: [
            { when: c => Boolean(c.improvement),
                say: c => `${improved(c)}. It is good to deliver a piece of encouraging news. I have kept the supporting record with it, just in case.` },
            { when: c => c.approval >= 60 && c.stability >= 60,
                say: c => `Approval is ${c.approval} and Stability is ${c.stability}. Those notices look reassuring. I have the next folder ready; a quiet corridor is no reason to lose our place.` },
            { when: () => true,
                say: c => `${lowReading(c)}, above the warning line. The notices are in order. I cannot promise the same of the stationery cupboard, but your next appointment is ready.` }
        ],
        objective: [
            { when: c => c.state.phase === 'event', say: () => 'I have the briefing folder ready. Please finish that appointment before moving to policy business.' },
            { when: c => c.state.phase === 'policy', say: () => 'The policy desk is ready. I will leave the approval folder open until you have checked the forecast.' },
            { when: () => true, say: () => 'The Cabinet record is ready for review. I file the completed turn before preparing the next folder.' }
        ],
        outcome: {
            reelected: 'We won re-election. I suppose I should order more folders. First, I will make sure the final accounts are filed where everyone can find them.',
            'election-lost': 'We lost the election. I will prepare the handover folders. Whoever comes through this corridor next should not have to hunt for the record.',
            survived: 'We survived the first 90 days. All three turn folders are accounted for. I might finally get a moment to label the shelves.',
            collapsed: 'The government has collapsed. I will preserve the notices and Cabinet records. They need to be available, even when they are difficult to read.'
        }
    }
};

function phaseTask(state) {
    if (state.phase === 'event') {
        const response = state.currentEvent.responses.find(item => item.id === state.selectedResponseId);
        return response
            ? `Your response has been selected: “${response.title}”. Finish the Chief of Staff briefing to continue to the policy phase.`
            : `The current event is “${state.currentEvent.title}”. Open the Chief of Staff briefing and choose a response.`;
    }
    if (state.phase === 'policy') {
        const policy = getScenario(state.mode).policies.find(item => item.id === state.selectedPolicyId);
        return policy ? `“${policy.title}” is selected, not enacted. Review its forecast at the National Policy Desk before approval.`
            : 'Choose a policy at the National Policy Desk and review its forecast before approval.';
    }
    return `Turn ${state.turn} has settled. Review the Cabinet Briefing Table before advancing.`;
}

function projectionMessage(state, npc) {
    if (state.phase !== 'policy' || !state.selectedPolicyId || state.outcome) return '';
    const projection = calculateTurn(state);
    const figures = npc.monitors.map(id => `${labels[id] ?? 'Debt'} ${id === 'debt' ? projection.debt : projection.meters[id]}`);
    const failures = projection.failures.filter(failure => npc.monitors.includes(failure.id));
    return `Selected choices project ${figures.join(', ')}; these figures are not settled.${failures.length
        ? ` ${failures.map(failure => failure.label).join(', ')} would reach zero. Revise the choice before approval.` : ''}`;
}

export function previousPolicyMessage(state, npc) {
    const effectsFor = report => npc.monitors.map(id => ({ id, amount: id === 'debt' ? report.newDebt
        : report.contributions[id].filter(effect => effect.type === 'policy').reduce((sum, effect) => sum + effect.amount, 0)
    })).filter(effect => effect.amount);
    const reports = [...state.history].reverse();
    const report = reports.find(item => effectsFor(item).length) ?? reports[0];
    if (!report) return '';
    const direct = effectsFor(report).map(effect => `${labels[effect.id] ?? 'Debt'} ${signed(effect.amount)}`);
    const prefix = {
        'chief-of-staff': 'For the record', 'defense-secretary': 'In my assessment',
        'press-secretary': 'For the next statement', 'government-aide': 'From the filed record',
        'finance-secretary': 'In the ledger'
    }[roleOf(npc)];
    const net = npc.monitors.filter(id => id !== 'debt').map(id => ({ id, amount: report.meters[id] - report.startMeters[id] }))
        .filter(effect => effect.amount).map(effect => `${labels[effect.id]} ${signed(effect.amount)}`);
    return `${prefix}: turn ${report.turn}’s “${report.policyTitle}” ${direct.length
        ? `directly applied ${direct.join(', ')}` : 'had no direct change to the figures I monitor'}.${net.length
        ? ` The full turn changed ${net.join(', ')} across all causes.` : ''}`;
}

export function officialOutcome(state, npc) {
    const bank = officials[roleOf(npc)];
    const voice = bank?.outcome[state.outcome] ?? {
        reelected: 'We won re-election. The final accounts are a record, not a fresh spending allowance.',
        'election-lost': 'We lost the election. Leave accurate accounts for the handover; debts do not leave office with us.',
        survived: 'We survived the first 90 days. I am keeping the ledger open; surviving a bill is not the same as paying every future one.',
        collapsed: 'The government has collapsed. Keep the ledger intact. Empty reserves do not excuse an incomplete account.'
    }[state.outcome];
    const figures = npc.monitors.map(id => `${labels[id] ?? 'Debt'} ${id === 'debt' ? state.debt : `${state.meters[id]}/100`}`);
    return [voice, `Final figures: ${figures.join(' · ')}.`, previousPolicyMessage(state, npc),
        getPresidentialObjective(state).description].filter(Boolean).join(' ');
}

export function officialCondition(state, npc) {
    if (state.outcome) return officialOutcome(state, npc);
    const bank = officials[roleOf(npc)];
    const context = contextFor(state, npc);
    const line = [...bank.critical, ...bank.warning, ...bank.normal].find(entry => entry.when(context));
    return [line.say(context), phaseTask(state), projectionMessage(state, npc), previousPolicyMessage(state, npc)]
        .filter(Boolean).join(' ');
}

export function officialObjective(state, npc) {
    const { title, location } = getPresidentialObjective(state);
    const bank = officials[roleOf(npc)];
    const context = contextFor(state, npc);
    const line = bank.objective.find(entry => entry.when(context));
    return {
        message: state.outcome ? officialOutcome(state, npc)
            : [line.say(context), phaseTask(state), projectionMessage(state, npc)].filter(Boolean).join(' '),
        figures: [['Current objective', title], ['Destination', location]]
    };
}
