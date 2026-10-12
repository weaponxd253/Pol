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

export function validateContent() {
  const meterIds = new Set(METERS.map(meter => meter.id));
  const ids = new Set();
  for (const card of [...EVENTS, ...POLICIES]) {
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
    }
  }
}
