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
        monitors: ['approval', 'treasury', 'donors', 'economy', 'international', 'stability'],
        topics: ['condition', 'objective', 'decisions']
    }, {
        action: 'npc-government-aide',
        name: 'Government Aide',
        hint: 'Ask for directions.',
        asset: './assets/government_aide.png',
        frameWidth: 256, frameHeight: 384, footY: 350, scale: 0.21,
        x: 680, y: 350, direction: 'down',
        talkRadius: 85, collisionRadius: 30,
        monitors: [],
        topics: ['directions', 'meeting', 'notices']
    }],
    CabinetRoomScene: [{
        action: 'npc-finance-secretary',
        name: 'Finance Secretary',
        hint: 'Ask for a budget update.',
        asset: './assets/finance_secretary.png',
        frameWidth: 256, frameHeight: 384, footY: 340, scale: 0.22,
        x: 555, y: 520, direction: 'down',
        talkRadius: 85, collisionRadius: 30,
        monitors: ['treasury', 'economy', 'debt'],
        topics: ['treasury', 'payments', 'debt', 'decisions']
    }],
    SituationRoomScene: [{
        action: 'npc-defense-secretary',
        name: 'Defense Secretary',
        hint: 'Ask about national readiness.',
        asset: './assets/defense_secretary.png',
        frameWidth: 256, frameHeight: 384, footY: 362, scale: 0.21,
        x: 826, y: 414, direction: 'down',
        talkRadius: 78, collisionRadius: 30,
        monitors: ['stability', 'international'],
        topics: ['security', 'foreign', 'decisions']
    }],
    PressBriefingRoomScene: [{
        action: 'npc-press-secretary',
        name: 'Press Secretary',
        hint: 'Ask about public approval.',
        asset: './assets/press_secretary.png',
        frameWidth: 256, frameHeight: 384, footY: 354, scale: 0.21,
        x: 580, y: 276, direction: 'down',
        talkRadius: 85, collisionRadius: 30,
        monitors: ['approval', 'donors'],
        topics: ['confidence', 'reputation', 'decisions']
    }]
};

export function getRoomNpcs(roomKey) {
    return roomNpcs[roomKey] ?? [];
}
