const union = 'arden-national-union';
const reformers = 'civic-reform-alliance';
const regional = 'regional-independence-coalition';
const commons = 'social-commons-party';

export const BILL_SCOPES = [
  { id: 'limited', label: 'Limited' },
  { id: 'standard', label: 'Standard' },
  { id: 'comprehensive', label: 'Comprehensive' }
];

export const BILLS = [
  {
    id: 'national-infrastructure-act',
    title: 'National Infrastructure Act',
    category: 'Infrastructure',
    description: 'Repair transport links and decide how much of the network Arden should rebuild.',
    scopes: {
      limited: {
        brief: 'Repair existing routes with published audits. The Civic Reform Alliance backs the spending controls.',
        immediate: { treasury: -4 }, later: [{ afterTurns: 2, effects: { economy: 2 } }],
        backers: [union, reformers]
      },
      standard: {
        brief: 'Fund road and freight improvements across the provinces, with a share reserved for local projects.',
        immediate: { treasury: -9, approval: 2 }, later: [{ afterTurns: 2, effects: { economy: 6 } }],
        backers: [union, regional]
      },
      comprehensive: {
        brief: 'Build a national rail and highway network. Central control costs regional backing, and maintenance raises the long-term bill.',
        immediate: { treasury: -16, approval: 4, donors: -2 },
        later: [{ afterTurns: 2, effects: { treasury: -3 } }, { afterTurns: 3, effects: { economy: 10 } }],
        backers: [union]
      }
    }
  },
  {
    id: 'public-healthcare-reform-act',
    title: 'Public Healthcare Reform Act',
    category: 'Healthcare',
    description: 'Expand access to care through clinics, subsidies, or a national coverage program.',
    scopes: {
      limited: {
        brief: 'Pilot mobile clinics under a spending cap. The limited reach helps secure fiscal reformers’ backing.',
        immediate: { treasury: -4, approval: 2 }, later: [{ afterTurns: 2, effects: { approval: 1 } }],
        backers: [union, reformers]
      },
      standard: {
        brief: 'Subsidize primary care nationwide. The Social Commons Party backs the wider access and clinic staffing.',
        immediate: { treasury: -9, approval: 3 },
        later: [{ afterTurns: 2, effects: { approval: 3 } }, { afterTurns: 3, effects: { treasury: -2 } }],
        backers: [union, commons]
      },
      comprehensive: {
        brief: 'Guarantee national coverage. Enrollment takes time, and the second round of funding puts pressure on Treasury.',
        immediate: { treasury: -16, approval: 5 },
        later: [{ afterTurns: 2, effects: { treasury: -5 } }, { afterTurns: 3, effects: { approval: 6 } }],
        backers: [union, commons]
      }
    }
  },
  {
    id: 'government-accountability-act',
    title: 'Government Accountability Act',
    category: 'Government Reform',
    description: 'Strengthen oversight of contracts, public officials, and political donations.',
    scopes: {
      limited: {
        brief: 'Publish a public contracts register. Transparency wins cross-party backing and irritates some donors.',
        immediate: { approval: 2, donors: -1 }, later: [{ afterTurns: 2, effects: { stability: 1 } }],
        backers: [union, reformers]
      },
      standard: {
        brief: 'Create independent procurement audits. Donors lose influence as public institutions gain credibility.',
        immediate: { approval: 4, donors: -4 }, later: [{ afterTurns: 2, effects: { stability: 4 } }],
        backers: [union, reformers, commons]
      },
      comprehensive: {
        brief: 'Empower an ethics commission to investigate senior officials and enforce donation limits. The president’s party balks at the wider powers.',
        immediate: { approval: 5, donors: -8, stability: -2 }, later: [{ afterTurns: 3, effects: { stability: 7 } }],
        backers: [reformers, commons]
      }
    }
  },
  {
    id: 'national-education-investment-act',
    title: 'National Education Investment Act',
    category: 'Education',
    description: 'Support schools and skills training, with economic gains arriving as students complete their programs.',
    scopes: {
      limited: {
        brief: 'Offer targeted school grants with public reporting and a capped budget.',
        immediate: { treasury: -3, approval: 2 }, later: [{ afterTurns: 2, effects: { economy: 2 } }],
        backers: [union, reformers]
      },
      standard: {
        brief: 'Fund vocational programs and rural school upgrades. Regional delegates back the investment outside the capital.',
        immediate: { treasury: -7, approval: 3 }, later: [{ afterTurns: 3, effects: { economy: 5 } }],
        backers: [union, regional]
      },
      comprehensive: {
        brief: 'Expand training and tuition support nationally. The Social Commons Party backs broader access, and a second appropriation funds capacity.',
        immediate: { treasury: -13, approval: 5 },
        later: [{ afterTurns: 2, effects: { treasury: -2 } }, { afterTurns: 4, effects: { economy: 9 } }],
        backers: [union, commons]
      }
    }
  },
  {
    id: 'economic-development-and-tax-reform-act',
    title: 'Economic Development and Tax Reform Act',
    category: 'Economic Reform',
    description: 'Raise revenue and redirect investment by deciding which tax preferences to eliminate.',
    scopes: {
      limited: {
        brief: 'Close a narrow set of loopholes. Treasury gains modest revenue while donors lose a few exemptions.',
        immediate: { treasury: 3, donors: -1 }, later: [{ afterTurns: 2, effects: { economy: 1 } }],
        backers: [union, reformers]
      },
      standard: {
        brief: 'Replace several tax credits with investment incentives tied to published performance measures.',
        immediate: { treasury: 7, donors: -4 }, later: [{ afterTurns: 2, effects: { economy: 4 } }],
        backers: [union, reformers]
      },
      comprehensive: {
        brief: 'Rewrite the tax code and redirect investment to the regions. Businesses face a transition shock, and the president’s party is wary of the backlash.',
        immediate: { treasury: 12, donors: -8, economy: -3 }, later: [{ afterTurns: 3, effects: { economy: 8 } }],
        backers: [reformers, regional]
      }
    }
  },
  {
    id: 'national-security-modernization-act',
    title: 'National Security Modernization Act',
    category: 'National Security',
    description: 'Modernize emergency communications and decide how far to centralize security powers.',
    scopes: {
      limited: {
        brief: 'Update emergency communications through open tenders. Fiscal reformers support the narrow procurement plan.',
        immediate: { treasury: -4, stability: 2 }, later: [{ afterTurns: 2, effects: { international: 2 } }],
        backers: [union, reformers]
      },
      standard: {
        brief: 'Modernize response networks and give provincial emergency offices a formal role.',
        immediate: { treasury: -9, stability: 4 }, later: [{ afterTurns: 2, effects: { international: 4 } }],
        backers: [union, regional]
      },
      comprehensive: {
        brief: 'Centralize intelligence and security coordination. Surveillance provisions unsettle partners before the new capabilities come online.',
        immediate: { treasury: -15, stability: 6, international: -3 },
        later: [{ afterTurns: 2, effects: { treasury: -3 } }, { afterTurns: 3, effects: { international: 8 } }],
        backers: [union]
      }
    }
  }
];

function billScope(billId, scopeId) {
  const bill = BILLS.find(item => item.id === billId);
  const option = BILL_SCOPES.find(item => item.id === scopeId);
  if (!bill || !option) throw new Error('Choose a valid legislative bill and scope.');
  return { bill, scope: bill.scopes[option.id], scopeLabel: option.label };
}

export function assessBill(state, billId, scopeId) {
  const { bill, scope, scopeLabel } = billScope(billId, scopeId);
  const { parties, majoritySeats } = state.assembly;
  const backers = parties.filter(party => scope.backers.includes(party.id));
  return {
    bill, scope, scopeLabel, backers, majoritySeats,
    likelySeats: backers.reduce((seats, party) => seats + party.seats, 0),
    treasuryIfEnacted: state.meters.treasury + (scope.immediate.treasury ?? 0)
  };
}

function requireActiveTerm(state) {
  if (state.mode !== 'term' || state.outcome) throw new Error('Legislation can be drafted and submitted during an active full term.');
}

function updateRecord(state, record) {
  const records = state.assembly.legislativeRecords;
  const legislativeRecords = records.some(item => item.billId === record.billId)
    ? records.map(item => item.billId === record.billId ? record : item)
    : [...records, record];
  return { ...state, assembly: { ...state.assembly, legislativeRecords } };
}

export function saveBillDraft(state, billId, scopeId) {
  requireActiveTerm(state);
  billScope(billId, scopeId);
  const current = state.assembly.legislativeRecords.find(record => record.billId === billId);
  if (current?.submittedTurn != null) throw new Error('This bill has already been submitted to the Assembly.');
  if (current?.scopeId === scopeId) return state;
  return updateRecord(state, { billId, scopeId, draftedTurn: state.turn, submittedTurn: null });
}

export function submitBill(state, billId) {
  requireActiveTerm(state);
  const draft = state.assembly.legislativeRecords.find(record => record.billId === billId);
  if (!draft) throw new Error('Save a draft before submitting this bill.');
  if (draft.submittedTurn !== null) throw new Error('This bill has already been submitted to the Assembly.');
  return updateRecord(state, { ...draft, submittedTurn: state.turn });
}

// Legislation has no simulation effects yet. Validate its records separately from turn replay.
export function restoreLegislativeRecords(records, currentTurn) {
  if (!Array.isArray(records) || records.length > BILLS.length) throw new Error('Invalid legislative records.');
  const seen = new Set();
  const validTurn = turn => Number.isInteger(turn) && turn >= 1 && turn <= currentTurn;
  return records.map(({ billId, scopeId, draftedTurn, submittedTurn }) => {
    billScope(billId, scopeId);
    if (seen.has(billId) || !validTurn(draftedTurn) ||
        (submittedTurn !== null && (!validTurn(submittedTurn) || submittedTurn < draftedTurn))) {
      throw new Error('Invalid legislative record.');
    }
    seen.add(billId);
    return { billId, scopeId, draftedTurn, submittedTurn };
  });
}
