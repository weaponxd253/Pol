import { containsRoomPoint, padRoomBlock } from './room-controls.js';

// Coordinates use the Situation Room artwork at 960 × 720.
export const SITUATION_ROOM_FLOOR = { x: 12, y: 64, w: 936, h: 650 };
export const SITUATION_ENTRANCE = { x: 480, y: 144 };

export const SITUATION_EXITS = [
    { x: 450, y: 64, w: 60, h: 41, name: 'North Passage', label: 'Return to Government Corridor', action: 'exit-situation-north' }
];

export const SITUATION_STATIONS = [
    { x: 435, y: 223, w: 90, h: 53, id: 'emergency', name: 'Emergency Briefing', action: 'situation-emergency' },
    { x: 423, y: 516, w: 115, h: 51, id: 'map', name: 'Strategic Map', action: 'situation-map' },
    { x: 135, y: 273, w: 175, h: 53, id: 'diplomacy', name: 'Diplomacy', action: 'situation-diplomacy' },
    { x: 650, y: 273, w: 175, h: 53, id: 'intelligence', name: 'Intelligence', action: 'situation-intelligence' },
    { x: 650, y: 479, w: 113, h: 73, id: 'security', name: 'National Security', action: 'situation-security' }
];
export const SITUATION_INTERACTIONS = [...SITUATION_EXITS, ...SITUATION_STATIONS];

export const SITUATION_BLOCKS = [
    // The north arch leaves an open route between the wall and console banks.
    { x: 0, y: 0, w: 430, h: 224 },
    { x: 530, y: 0, w: 430, h: 224 },
    { x: 11, y: 208, w: 112, h: 43 },
    { x: 836, y: 208, w: 113, h: 43 },
    { x: 119, y: 202, w: 213, h: 60 },
    { x: 624, y: 202, w: 216, h: 60 },
    // Strategic table, its rounded ends, and surrounding chairs.
    { x: 297, y: 348, w: 365, h: 153 },
    { x: 258, y: 377, w: 443, h: 94 },
    { x: 340, y: 294, w: 68, h: 66 },
    { x: 446, y: 294, w: 68, h: 66 },
    { x: 552, y: 294, w: 68, h: 66 },
    { x: 210, y: 350, w: 57, h: 104 },
    { x: 692, y: 350, w: 56, h: 104 },
    { x: 328, y: 466, w: 74, h: 86 },
    { x: 557, y: 466, w: 76, h: 86 },
    // South walls and columns leave the entrance aisle clear.
    { x: 0, y: 603, w: 409, h: 117 },
    { x: 550, y: 603, w: 410, h: 117 },
    { x: 205, y: 583, w: 29, h: 42 },
    { x: 605, y: 583, w: 44, h: 42 }
].map(padRoomBlock);

export function canWalkSituationRoom(x, y) {
    return containsRoomPoint(SITUATION_ROOM_FLOOR, x, y) &&
        !SITUATION_BLOCKS.some(block => containsRoomPoint(block, x, y));
}

export function getSituationInteraction(x, y) {
    if (!canWalkSituationRoom(x, y)) return null;
    return SITUATION_INTERACTIONS.find(interaction => containsRoomPoint(interaction, x, y)) ?? null;
}
