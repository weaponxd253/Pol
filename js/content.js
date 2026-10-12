export const TOTAL_TURNS = 3;

export const METERS = [
  { id: 'approval', label: 'Public Approval', short: 'Approval', icon: 'people', description: 'Public mandate', failure: 'Your government has lost its public mandate.' },
  { id: 'treasury', label: 'Treasury', short: 'Treasury', icon: 'vault', description: 'Available funds', failure: 'Your government cannot meet its obligations.' },
  { id: 'donors', label: 'Donor Confidence', short: 'Donors', icon: 'handshake', description: 'Governing support', failure: 'Your governing coalition has lost its funding.' },
  { id: 'economy', label: 'Economy', short: 'Economy', icon: 'chart', description: 'Tax revenue driver', failure: 'The economy has collapsed.' },
  { id: 'international', label: 'International Standing', short: 'International', icon: 'globe', description: 'External relations', failure: 'Your government has become diplomatically isolated.' },
  { id: 'stability', label: 'Stability', short: 'Stability', icon: 'shield', description: 'Civil order', failure: 'Unrest has overwhelmed your institutions.' },
];

export const EVENTS = [
  {
    id: 'slowdown', title: 'Economic slowdown', category: 'Economic pressure', icon: 'chart',
    description: 'Employers are cutting hours. Households are asking for support, but your government has little room in its budget.',
    responses: [
      { id: 'relief', title: 'Fund household relief', description: 'Give families breathing room and soften the downturn.', effects: { approval: 6, treasury: -10, economy: -4 } },
      { id: 'absorb', title: 'Absorb the downturn', description: 'Protect the public purse while households bear the shock.', effects: { approval: -6, economy: -12, stability: -4 } },
    ],
  },
  {
    id: 'workers', title: 'Public workers demand relief', category: 'Domestic pressure', icon: 'people',
    description: 'After a prolonged pay freeze, public workers threaten disruption. A settlement buys peace. Holding the line preserves funds.',
    responses: [
      { id: 'settlement', title: 'Fund a temporary settlement', description: 'Offer temporary relief to keep essential services running.', effects: { treasury: -8, approval: 5, stability: 6 } },
      { id: 'freeze', title: 'Maintain the freeze', description: 'Keep spending contained and accept the political fallout.', effects: { approval: -7, stability: -8, donors: 4 } },
    ],
  },
  {
    id: 'review', title: 'International funding review', category: 'International pressure', icon: 'globe',
    description: 'An external fund offers financial support in exchange for oversight. The money would help, but accepting conditions carries a political cost.',
    responses: [
      { id: 'oversight', title: 'Accept the oversight agreement', description: 'Unlock support and closer relations, at the cost of domestic approval.', effects: { treasury: 8, international: 4, approval: -6 } },
      { id: 'decline', title: 'Decline the agreement', description: 'Retain control and risk a loss of external confidence.', effects: { international: -6, donors: -4 }, debtRule: { threshold: 18, treasury: -4 } },
    ],
  },
];

export const POLICIES = [
  {
    id: 'services', title: 'Expand public services', category: 'Public investment', icon: 'people',
    description: 'Improve everyday services and restore confidence in government.',
    effects: { approval: 9, stability: 4, treasury: -6 },
    future: [{ offset: 1, meter: 'treasury', amount: -3 }, { offset: 2, meter: 'treasury', amount: -3 }],
    consequence: 'Costs 3 Treasury on each of the next two turns.',
  },
  {
    id: 'cuts', title: 'Cut discretionary spending', category: 'Fiscal restraint', icon: 'scissors',
    description: 'Free up funds by scaling back spending. People will feel the cuts.',
    effects: { treasury: 10, approval: -8, stability: -5 }, future: [],
    consequence: 'No scheduled costs.',
  },
  {
    id: 'taxes', title: 'Raise business taxes', category: 'Revenue', icon: 'vault',
    description: 'Collect more revenue now, while putting pressure on business confidence.',
    effects: { treasury: 12, donors: -9 }, future: [{ offset: 1, meter: 'economy', amount: -3 }],
    consequence: 'Economy falls by 3 next turn, affecting tax revenue.',
  },
  {
    id: 'regulations', title: 'Ease business regulations', category: 'Economic policy', icon: 'chart',
    description: 'Encourage business activity, with a cost to public and international confidence.',
    effects: { donors: 8, economy: 5, approval: -4, international: -3 }, future: [],
    consequence: 'No scheduled costs.',
  },
  {
    id: 'bonds', title: 'Issue emergency bonds', category: 'Borrowing', icon: 'document',
    description: 'Bring future funds forward. Your government keeps the debt.',
    effects: { treasury: 18 }, debt: 18, future: [],
    consequence: 'Adds 18 debt. Interest begins this turn and continues afterward.',
  },
  {
    id: 'aid', title: 'Negotiate an aid package', category: 'Diplomacy', icon: 'globe',
    description: 'Secure external support while accepting a loss of domestic backing.',
    effects: { international: 7, treasury: 8, approval: -4, donors: -4 }, future: [],
    consequence: 'No scheduled costs.',
  },
];

export const CONTENT_VERSION = 2;
export const RULES_VERSION = 1;
export const TERM_POLICIES = [
  ...POLICIES.map(policy => policy.id === 'services' ? { ...policy, future: [1, 2, 3].map(offset => ({ offset, meter: 'treasury', amount: -3 })), consequence: 'Costs 3 Treasury on each of the next three turns.' } : policy),
  { id: 'credit', title: 'Emergency credit line', category: 'Borrowing', icon: 'document', description: 'Secure a larger rescue package with a heavier obligation.', effects: { treasury: 20, donors: 3, approval: -2 }, debt: 24, future: [], consequence: 'Adds 24 debt. Interest starts immediately; high debt can worsen funding events.' },
  { id: 'repayment', title: 'Repay government debt', category: 'Debt management', icon: 'vault', description: 'Use current funds to reduce future interest and financing pressure.', effects: { donors: 3 }, repayDebt: 10, future: [], consequence: 'Repay up to 10 debt. Costs exactly the Treasury amount repaid.' },
  { id: 'infrastructure', title: 'Infrastructure investment', category: 'Long-term investment', icon: 'chart', description: 'Repair transport links now so businesses can grow later.', effects: { treasury: -8, approval: 2, stability: 2 }, future: [{ offset: 2, meter: 'economy', amount: 8 }], consequence: 'Economy rises by 8 in two turns, improving future tax revenue.' },
  { id: 'training', title: 'Job training program', category: 'Economic investment', icon: 'people', description: 'Help workers move into new jobs and build productive capacity.', effects: { treasury: -6, approval: 4, donors: 3 }, future: [{ offset: 1, meter: 'economy', amount: 6 }], consequence: 'Economy rises by 6 next turn, before revenue is calculated.' },
  { id: 'consultation', title: 'Public consultation', category: 'Public trust', icon: 'people', description: 'Give communities a voice while conceding ground to public concerns.', effects: { treasury: -3, approval: 7, stability: 5, donors: -4 }, future: [], consequence: 'No scheduled costs.' },
  { id: 'reform', title: 'Procurement reform', category: 'Institutional trust', icon: 'shield', description: 'Tighten contracting rules and challenge established interests.', effects: { treasury: -3, approval: 6, stability: 5, donors: -6 }, future: [], consequence: 'No scheduled costs.' },
  { id: 'responders', title: 'Upgrade emergency services', category: 'Preparedness', icon: 'shield', description: 'Strengthen the institutions that respond to emergencies.', effects: { treasury: -6, stability: 10, approval: 3 }, future: [], consequence: 'No scheduled costs.' },
  { id: 'outreach', title: 'Diplomatic outreach', category: 'Diplomacy', icon: 'globe', description: 'Rebuild external relationships while critics question your priorities.', effects: { treasury: -4, international: 10, approval: -3 }, future: [], consequence: 'No scheduled costs.' },
  { id: 'trade', title: 'Trade agreement', category: 'External investment', icon: 'globe', description: 'Open markets while accepting unpopular domestic concessions.', effects: { treasury: -5, economy: 5, international: 6, donors: 3, approval: -4 }, future: [], consequence: 'No scheduled costs.' },
  { id: 'wages', title: 'Temporary wage support', category: 'Public support', icon: 'people', description: 'Support incomes with a promise that outlasts today’s decision.', effects: { treasury: -4, approval: 10, stability: 3 }, future: [1, 2, 3].map(offset => ({ offset, meter: 'treasury', amount: -3 })), consequence: 'Costs 3 Treasury on each of the next three turns.' },
];

const debtFee = amount => ({ metric: 'debt', comparison: 'gte', threshold: 30, effects: { treasury: -amount }, description: `Debt of 30 or more adds a ${amount} Treasury financing cost.` });
const disruption = effects => ({ metric: 'stability', comparison: 'lt', threshold: 30, effects, description: `Stability below 30 worsens disruption: ${Object.entries(effects).map(([key, amount]) => `${key === 'treasury' ? 'Treasury' : 'Stability'} −${Math.abs(amount)}`).join(', ')}.` });
export const TERM_EVENTS = [
  ...EVENTS.map(event => ({ ...event, responses: event.responses.map(response => {
    const { debtRule, ...base } = response;
    return { ...base, conditions: event.id === 'review' && response.id === 'decline' ? [debtFee(5)] : event.id === 'workers' ? [disruption(response.id === 'settlement' ? { treasury: -3 } : { stability: -4 })] : [] };
  }) })),
  { id: 'prices', title: 'Cost-of-living squeeze', category: 'Economic pressure', icon: 'chart', description: 'Import costs are rising. Families want relief, but subsidies are straining the budget.', responses: [
    { id: 'subsidies', title: 'Subsidize essential goods', description: 'Shield households from the worst increases.', effects: { approval: 6, treasury: -8, economy: -2 } },
    { id: 'withdraw', title: 'Suspend import subsidies', description: 'Restore fiscal room while households absorb the shock.', effects: { treasury: 6, approval: -5, economy: -3, stability: -3 } },
  ] },
  { id: 'surplus', title: 'Unexpected tax surplus', category: 'Economic opportunity', icon: 'vault', description: 'A one-off collection brings extra revenue. Build a reserve or return much of it to households.', responses: [
    { id: 'reserve', title: 'Build the reserve', description: 'Keep the windfall for difficult decisions ahead.', effects: { treasury: 12, approval: -2 } },
    { id: 'rebate', title: 'Return the windfall', description: 'Give households a rebate and retain a smaller surplus.', effects: { approval: 7, treasury: 4, stability: 2 } },
  ] },
  { id: 'credit-freeze', title: 'Credit-market freeze', category: 'Economic pressure', icon: 'vault', description: 'Banks are pulling back. A guarantee could restore activity, but taxpayers would carry the cost.', responses: [
    { id: 'guarantee', title: 'Guarantee business lending', description: 'Spend public funds to keep credit flowing.', effects: { treasury: -7, economy: 6, donors: 4, approval: -2 }, conditions: [debtFee(5)] },
    { id: 'protect', title: 'Protect public reserves', description: 'Free up funds and let the squeeze run its course.', effects: { treasury: 4, economy: -7, donors: -5, approval: -3 }, conditions: [debtFee(3)] },
  ] },
  { id: 'scandal', title: 'Procurement scandal', category: 'Domestic pressure', icon: 'document', description: 'Questions about public contracts threaten confidence in your coalition.', responses: [
    { id: 'inquiry', title: 'Commission an independent inquiry', description: 'Rebuild trust at the expense of funding allies.', effects: { treasury: -4, approval: 5, stability: 5, donors: -5 } },
    { id: 'defend', title: 'Defend the coalition', description: 'Preserve alliances while public distrust grows.', effects: { donors: 5, approval: -8, stability: -5 } },
  ] },
  { id: 'donor-demands', title: 'Donor coalition demands', category: 'Domestic pressure', icon: 'handshake', description: 'Key funders want preferential contracts. Their backing comes with concessions the public may reject.', responses: [
    { id: 'concessions', title: 'Grant the concessions', description: 'Strengthen funding support and accept public criticism.', effects: { donors: 10, approval: -7, international: -3 } },
    { id: 'reject', title: 'Reject the demands', description: 'Protect public trust and risk coalition funding.', effects: { approval: 4, donors: -10, stability: -2 } },
  ] },
  { id: 'flood', title: 'Flood emergency', category: 'Domestic pressure', icon: 'shield', description: 'Flooding has damaged homes and disrupted services. Your response will test the institutions keeping order.', responses: [
    { id: 'emergency', title: 'Fund emergency response', description: 'Mobilize the national response and restore confidence.', effects: { treasury: -8, stability: 7, approval: 4 }, conditions: [disruption({ treasury: -3 })] },
    { id: 'local', title: 'Rely on local capacity', description: 'Limit national spending while communities bear the damage.', effects: { treasury: -2, stability: -8, economy: -3, approval: -5 }, conditions: [disruption({ stability: -4 })] },
  ] },
  { id: 'trade-opening', title: 'Trade opportunity', category: 'International opportunity', icon: 'globe', description: 'A neighboring market is opening. A broad agreement brings investment and domestic concessions.', responses: [
    { id: 'corridor', title: 'Open an export corridor', description: 'Invest in a larger agreement with wider gains.', effects: { treasury: -5, economy: 6, international: 7, donors: 2, approval: -2 } },
    { id: 'limited', title: 'Secure a limited deal', description: 'Take a smaller opportunity with fewer concessions.', effects: { treasury: -1, international: 3, economy: 2, approval: 2, donors: -3 } },
  ] },
  { id: 'dispute', title: 'Diplomatic dispute', category: 'International pressure', icon: 'globe', description: 'A disagreement with a partner is escalating. Domestic audiences and foreign counterparts want different things.', responses: [
    { id: 'negotiate', title: 'Negotiate concessions', description: 'Repair relations while critics accuse you of giving ground.', effects: { international: 7, treasury: -4, approval: -4 } },
    { id: 'firm', title: 'Take a firm stance', description: 'Rally public support and risk external cooperation.', effects: { approval: 5, international: -9, donors: -3 } },
  ] },
  { id: 'humanitarian', title: 'Humanitarian assistance request', category: 'International pressure', icon: 'people', description: 'A partner asks for assistance. Helping builds goodwill but draws on funds needed at home.', responses: [
    { id: 'mission', title: 'Join the relief mission', description: 'Contribute funds and strengthen external support.', effects: { international: 8, treasury: -5, approval: 1 } },
    { id: 'domestic', title: 'Prioritize local needs', description: 'Preserve funds and public backing while disappointing partners.', effects: { treasury: 3, approval: 3, international: -7 } },
  ] },
];

export const SCENARIOS = {
  quick: { id: 'quick', title: 'The First 90 Days', turns: 3, treasury: 24, electionTarget: null, events: EVENTS, policies: POLICIES },
  term: { id: 'term', title: 'Your First Term', turns: 12, treasury: 45, electionTarget: 50, events: TERM_EVENTS, policies: TERM_POLICIES },
};
export function getScenario(mode = 'quick') {
  if (!Object.hasOwn(SCENARIOS, mode)) throw new Error('Unknown game mode.');
  return SCENARIOS[mode];
}

export function validateContent() {
  const meterIds = new Set(METERS.map(meter => meter.id));
  for (const scenario of Object.values(SCENARIOS)) {
  const ids = new Set();
  for (const card of [...scenario.events, ...scenario.policies]) {
    if (ids.has(card.id)) throw new Error(`Duplicate card ID: ${card.id}`);
    ids.add(card.id);
    const choices = card.responses || [card];
    const responseIds = new Set();
    for (const choice of choices) {
      if (responseIds.has(choice.id)) throw new Error(`Duplicate response ID: ${choice.id}`);
      responseIds.add(choice.id);
      for (const [meter, amount] of Object.entries(choice.effects)) {
        if (!meterIds.has(meter) || !Number.isFinite(amount)) throw new Error(`Invalid effect on ${choice.id}`);
      }
      for (const effect of choice.future || []) {
        if (!meterIds.has(effect.meter) || !Number.isFinite(effect.amount) || !Number.isInteger(effect.offset) || effect.offset < 1) {
          throw new Error(`Invalid scheduled effect on ${choice.id}`);
        }
      }
      for (const condition of choice.conditions || []) {
        if ((!meterIds.has(condition.metric) && condition.metric !== 'debt') || !['gte', 'lt'].includes(condition.comparison) || !Number.isFinite(condition.threshold)) throw new Error(`Invalid condition on ${choice.id}`);
        for (const [meter, amount] of Object.entries(condition.effects)) if (!meterIds.has(meter) || !Number.isFinite(amount)) throw new Error(`Invalid conditional effect on ${choice.id}`);
      }
      for (const amount of [choice.debt, choice.repayDebt].filter(value => value !== undefined)) if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Invalid debt operation on ${choice.id}`);
    }
  }
  }
}
