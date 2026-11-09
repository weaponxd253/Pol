// Each room lists its staff. Foot origins are in source-frame pixels.
const roomNpcs = {
    GovernmentCorridorScene: [{
        action: 'npc-chief-of-staff',
        name: 'Chief of Staff',
        hint: 'Ask about your next objective.',
        asset: './assets/chief_of_staff.png',
        frameWidth: 256, frameHeight: 384, footY: 378, scale: 0.22,
        x: 270, y: 370, direction: 'down',
        talkRadius: 85, collisionRadius: 18,
        monitors: ['approval', 'treasury', 'donors', 'economy', 'international', 'stability'],
        topics: ['status', 'condition', 'objective', 'decisions', 'legislative-support']
    }, {
        action: 'npc-government-aide',
        name: 'Government Aide',
        hint: 'Ask for directions.',
        asset: './assets/government_aide.png',
        frameWidth: 256, frameHeight: 384, footY: 350, scale: 0.21,
        x: 680, y: 350, direction: 'down',
        talkRadius: 85, collisionRadius: 18,
        patrol: {
            speed: 42, pauseMs: 900,
            points: [{ x: 680, y: 350 }, { x: 800, y: 350 }, { x: 800, y: 470 },
                { x: 620, y: 470 }, { x: 620, y: 350 }]
        },
        monitors: ['approval', 'stability', 'treasury'],
        topics: ['status', 'directions', 'meeting', 'notices', 'decisions']
    }, {
        action: 'npc-coalition-leader',
        name: 'Coalition Leader',
        partyId: 'regional-independence-coalition',
        hint: 'Discuss provisions for the provinces.',
        asset: './assets/finance_secretary.png',
        frameWidth: 256, frameHeight: 384, footY: 340, scale: 0.22, tint: 0xffc99c,
        x: 555, y: 455, direction: 'left',
        talkRadius: 80, collisionRadius: 18
    }],
    CabinetRoomScene: [{
        action: 'npc-finance-secretary',
        name: 'Finance Secretary',
        hint: 'Ask how the finances are going.',
        asset: './assets/finance_secretary.png',
        frameWidth: 256, frameHeight: 384, footY: 340, scale: 0.22,
        x: 555, y: 520, direction: 'down',
        talkRadius: 85, collisionRadius: 18,
        monitors: ['treasury', 'economy', 'debt'],
        topics: ['finances', 'treasury', 'payments', 'debt', 'finance-objective', 'decisions', 'legislative-finance']
    }, {
        action: 'npc-government-whip',
        name: 'Government Whip',
        partyId: 'arden-national-union',
        hint: 'Ask about caucus support and possible defections.',
        asset: './assets/government_aide.png',
        frameWidth: 256, frameHeight: 384, footY: 350, scale: 0.22, tint: 0xb8e9cc,
        x: 380, y: 532, direction: 'right',
        talkRadius: 80, collisionRadius: 18
    }],
    SituationRoomScene: [{
        action: 'npc-defense-secretary',
        name: 'Defense Secretary',
        hint: 'Ask about national readiness.',
        asset: './assets/defense_secretary.png',
        frameWidth: 256, frameHeight: 384, footY: 362, scale: 0.21,
        x: 826, y: 414, direction: 'down',
        talkRadius: 78, collisionRadius: 18,
        monitors: ['stability', 'international'],
        topics: ['status', 'security', 'foreign', 'objective', 'decisions']
    }],
    PressBriefingRoomScene: [{
        action: 'npc-press-secretary',
        name: 'Press Secretary',
        hint: 'Ask about public approval.',
        asset: './assets/press_secretary.png',
        frameWidth: 256, frameHeight: 384, footY: 354, scale: 0.21,
        x: 580, y: 276, direction: 'down',
        talkRadius: 85, collisionRadius: 18,
        monitors: ['approval', 'donors'],
        topics: ['status', 'confidence', 'reputation', 'objective', 'decisions']
    }, {
        action: 'npc-opposition-leader',
        name: 'Opposition Leader',
        partyId: 'civic-reform-alliance',
        hint: 'Discuss fiscal limits and independent oversight.',
        asset: './assets/chief_of_staff.png',
        frameWidth: 256, frameHeight: 384, footY: 378, scale: 0.22, tint: 0xffe4ac,
        x: 480, y: 435, direction: 'down',
        talkRadius: 78, collisionRadius: 18
    }]
};

export function getRoomNpcs(roomKey) {
    return roomNpcs[roomKey] ?? [];
}

export function getNegotiatorNpcs() {
    return Object.values(roomNpcs).flat().filter(npc => npc.partyId);
}
