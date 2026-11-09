const governing = 'arden-national-union';
const reform = 'civic-reform-alliance';
const regional = 'regional-independence-coalition';
const commons = 'social-commons-party';

export const NEGOTIATORS = {
  [governing]: {
    name: 'Mara Venn', role: 'Government Whip', location: 'Cabinet Room',
    greeting: 'Give me the bill and I’ll tell you where our caucus stands. A party label only gets you so far.'
  },
  [reform]: {
    name: 'Elias Soren', role: 'Opposition Leader', location: 'Press Briefing Room',
    greeting: 'I’ll hear the case. Show me how the money is spent and who answers for it.'
  },
  [regional]: {
    name: 'Talia Vale', role: 'Coalition Leader', location: 'Government Corridor',
    greeting: 'My members answer to their provinces. Let’s see what the bill would deliver outside the capital.'
  }
};

// Each leader brings one distinct provision to each filed bill.
export const BILL_AMENDMENTS = {
  'national-infrastructure-act': {
    [regional]: {
      id: 'rural-infrastructure-fund', title: 'Rural Infrastructure Fund', type: 'Funding increase',
      request: 'Set aside new money for rural bridges and feeder roads. I can bring several provincial members to the table with projects they can point to.',
      immediate: { treasury: -5 }, later: [{ afterTurns: 3, effects: { economy: 2 } }],
      support: { [regional]: 14, [governing]: -1, [reform]: -3 }
    },
    [reform]: {
      id: 'independent-project-audits', title: 'Independent Project Audits', type: 'Oversight',
      request: 'Give an independent auditor access to contracts and publish the findings. My procurement reformers need that in the bill.',
      immediate: { treasury: -1 }, later: [{ afterTurns: 2, effects: { stability: 2 } }],
      support: { [reform]: 11, [governing]: 1 }
    },
    [governing]: {
      id: 'phase-in-construction', title: 'Phased Construction Start', type: 'Implementation delay',
      request: 'Start construction one turn after enactment. A later first appropriation could reassure our budget hawks, though the provinces would have to wait.',
      delay: 1, support: { [governing]: 4, [reform]: 4, [regional]: -3 }
    }
  },
  'public-healthcare-reform-act': {
    [regional]: {
      id: 'provincial-clinic-allocation', title: 'Provincial Clinic Allocation', type: 'Regional allocation',
      request: 'Put a share of the clinic money under provincial health boards and fund the extra rural sites.',
      immediate: { treasury: -2 }, later: [{ afterTurns: 2, effects: { stability: 2 } }],
      support: { [regional]: 10, [reform]: -3 }
    },
    [reform]: {
      id: 'cap-health-subsidies', title: 'Cap Health Subsidies', type: 'Funding reduction',
      request: 'Cap the subsidy and narrow eligibility. That reduces the appropriation, but fewer patients will qualify.',
      immediate: { treasury: 3, approval: -2 }, minimumTrust: -1,
      support: { [reform]: 11, [commons]: -4 }
    },
    [governing]: {
      id: 'coverage-renewal-clause', title: 'Coverage Renewal Clause', type: 'Sunset provision',
      request: 'Require a renewal vote after the first implementation turn. We can win over members wary of a permanent commitment by letting the later costs and gains expire.',
      sunsetAfter: 1, support: { [governing]: 5, [reform]: 5, [commons]: -4 }
    }
  },
  'government-accountability-act': {
    [regional]: {
      id: 'provincial-review-panels', title: 'Provincial Review Panels', type: 'Regional allocation',
      request: 'Give provincial review panels the power and funding to investigate local contracts. Our members want a voice in how the rules are enforced.',
      immediate: { treasury: -2 }, later: [{ afterTurns: 2, effects: { stability: 1 } }],
      support: { [regional]: 9, [governing]: -2 }
    },
    [reform]: {
      id: 'publish-enforcement-findings', title: 'Publish Enforcement Findings', type: 'Oversight',
      request: 'Require public enforcement findings and an appeals register. Donors will object, but oversight has to be visible to work.',
      immediate: { treasury: -1, approval: 1, donors: -1 },
      support: { [reform]: 7, [commons]: 3 }
    },
    [governing]: {
      id: 'phase-in-disclosure', title: 'Disclosure Transition Period', type: 'Implementation delay',
      request: 'Give public offices one turn to prepare for the new disclosure rules. Some of our members are worried about disruption at the start.',
      delay: 1, support: { [governing]: 7, [reform]: -4 }
    }
  },
  'national-education-investment-act': {
    [regional]: {
      id: 'rural-school-funding-floor', title: 'Rural School Funding Floor', type: 'Funding increase',
      request: 'Guarantee funding for rural schools even where enrollment is low. The up-front cost buys training capacity that those districts cannot fund alone.',
      immediate: { treasury: -3 }, later: [{ afterTurns: 3, effects: { economy: 3 } }],
      support: { [regional]: 11, [reform]: -2 }
    },
    [reform]: {
      id: 'audit-school-grants', title: 'Audit School Grant Awards', type: 'Oversight',
      request: 'Publish selection criteria for grants and let an independent inspector examine the awards.',
      immediate: { treasury: -1 }, later: [{ afterTurns: 2, effects: { stability: 2 } }],
      support: { [reform]: 11 }
    },
    [governing]: {
      id: 'delay-education-rollout', title: 'Delayed Education Rollout', type: 'Implementation delay',
      request: 'Move the funding and enrollment start back one turn. That gives the budget committee time to prepare and students a later start.',
      delay: 1, support: { [governing]: 4, [reform]: 4, [regional]: -3 }
    }
  },
  'economic-development-and-tax-reform-act': {
    [regional]: {
      id: 'provincial-reinvestment-share', title: 'Provincial Reinvestment Share', type: 'Regional allocation',
      request: 'Return a share of the new receipts to provincial development funds. That reduces national revenue today and gives local employers more room to invest.',
      immediate: { treasury: -3 }, later: [{ afterTurns: 3, effects: { economy: 2 } }],
      minimumTrust: 1, support: { [regional]: 10, [reform]: -3 }
    },
    [reform]: {
      id: 'independent-revenue-review', title: 'Independent Revenue Review', type: 'Oversight',
      request: 'Have an independent board report who receives the replacement incentives. Set aside a small appropriation so the board can do its work.',
      immediate: { treasury: -1 }, later: [{ afterTurns: 2, effects: { stability: 1 } }],
      support: { [reform]: 8 }
    },
    [governing]: {
      id: 'protect-transition-credits', title: 'Protect Transition Credits', type: 'Tax relief',
      request: 'Preserve temporary credits for employers adjusting to the new rules. It costs revenue and eases resistance from donors and some of our members.',
      immediate: { treasury: -3, donors: 3 }, minimumTrust: 1,
      support: { [governing]: 7, [reform]: -4 }
    }
  },
  'national-security-modernization-act': {
    [regional]: {
      id: 'regional-emergency-equipment', title: 'Regional Emergency Equipment', type: 'Regional allocation',
      request: 'Reserve funds for provincial emergency teams to buy compatible equipment. If the plan protects local response capacity, my members will consider it.',
      immediate: { treasury: -3 }, later: [{ afterTurns: 2, effects: { stability: 2 } }],
      minimumTrust: -Infinity, support: { [regional]: 10 }
    },
    [reform]: {
      id: 'civilian-surveillance-review', title: 'Civilian Surveillance Review', type: 'Oversight',
      request: 'Require independent civilian review of surveillance. My members will hear a national security case if the bill puts real limits on those powers.',
      immediate: { treasury: -1 }, later: [{ afterTurns: 2, effects: { international: 2 } }],
      minimumTrust: -Infinity, support: { [reform]: 11, [commons]: 4 }
    },
    [governing]: {
      id: 'emergency-powers-sunset', title: 'Emergency Powers Sunset', type: 'Sunset provision',
      request: 'Let the new powers expire after the first implementation turn unless renewed. That drops the later costs and capability gains, and brings wary colleagues closer.',
      sunsetAfter: 1, minimumTrust: -Infinity,
      support: { [governing]: 5, [reform]: 7, [commons]: 3 }
    }
  }
};
