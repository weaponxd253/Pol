// Party IDs are permanent references for saves and future legislative records.
const parties = [
  {
    id: 'arden-national-union',
    name: 'Arden National Union',
    color: '#23674f',
    status: 'governing',
    seats: 46,
    description: 'The president’s party backs a strong national administration and investment in public services.',
    priorities: ['Public service delivery', 'National infrastructure']
  },
  {
    id: 'civic-reform-alliance',
    name: 'Civic Reform Alliance',
    color: '#8d6424',
    status: 'opposition',
    seats: 25,
    description: 'Reformers press for tighter scrutiny of public spending and clearer rules for awarding contracts.',
    priorities: ['Fiscal oversight', 'Transparent procurement']
  },
  {
    id: 'regional-independence-coalition',
    name: 'Regional Independence Coalition',
    color: '#9a5142',
    status: 'opposition',
    seats: 18,
    description: 'Regional delegates seek greater local control and investment in roads and utilities outside the capital.',
    priorities: ['Regional infrastructure spending', 'Local autonomy']
  },
  {
    id: 'social-commons-party',
    name: 'Social Commons Party',
    color: '#655278',
    status: 'opposition',
    seats: 11,
    description: 'Labor and community organizers advocate for affordable housing and stronger protections for workers.',
    priorities: ['Affordable housing', 'Worker protections']
  }
];

export function createAssembly() {
  const totalSeats = 100;
  if (parties.some(party => !Number.isInteger(party.seats) || party.seats < 1) ||
      parties.reduce((sum, party) => sum + party.seats, 0) !== totalSeats) {
    throw new Error('The National Assembly must have exactly 100 seats.');
  }

  return {
    totalSeats,
    majoritySeats: Math.floor(totalSeats / 2) + 1,
    presidentialPartyId: 'arden-national-union',
    parties: structuredClone(parties),
    legislativeRecords: [],
    negotiationHistory: []
  };
}
