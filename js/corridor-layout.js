import { containsRoomPoint, padRoomBlock } from './room-controls.js';

// Coordinates are measured against the corridor artwork at 960 × 720.
export const CORRIDOR_ENTRANCE = { x: 480, y: 254 };
export const CABINET_CORRIDOR_ENTRANCE = { x: 150, y: 254 };
export const PRESS_CORRIDOR_ENTRANCE = { x: 811, y: 254 };
export const CORRIDOR_SOUTH_ENTRANCE = { x: 480, y: 625 };
export const CORRIDOR_FLOOR = { x: 12, y: 214, w: 936, h: 500 };

const solids = [
    // North wall projections: marble columns, door jambs, and planter bases.
    { x: 11, y: 162, w: 43, h: 62 },
    { x: 79, y: 180, w: 24, h: 38 },
    { x: 196, y: 180, w: 25, h: 38 },
    { x: 240, y: 161, w: 41, h: 64 },
    { x: 314, y: 179, w: 33, h: 51 },
    { x: 359, y: 163, w: 38, h: 60 },
    { x: 408, y: 180, w: 24, h: 38 },
    { x: 526, y: 180, w: 24, h: 38 },
    { x: 561, y: 163, w: 38, h: 60 },
    { x: 617, y: 179, w: 34, h: 51 },
    { x: 680, y: 161, w: 41, h: 64 },
    { x: 740, y: 180, w: 24, h: 38 },
    { x: 858, y: 180, w: 24, h: 38 },
    { x: 904, y: 162, w: 43, h: 62 },
    // South walls stop at the passage, with caps just above the wall line.
    { x: 0, y: 553, w: 349, h: 167 },
    { x: 608, y: 553, w: 352, h: 167 },
    { x: 298, y: 547, w: 41, h: 20 },
    { x: 615, y: 547, w: 42, h: 20 }
];

export const CORRIDOR_BLOCKS = solids.map(padRoomBlock);

export const CORRIDOR_DOORS = [
    { x: 105, y: 208, w: 89, h: 70, name: 'Cabinet Room', label: 'Enter Cabinet Room', action: 'cabinet-room' },
    { x: 434, y: 208, w: 90, h: 70, name: 'Executive Office', label: 'Enter Executive Office', action: 'enter-office' },
    { x: 766, y: 208, w: 90, h: 70, name: 'Press Briefing Room', label: 'Enter Press Briefing Room', action: 'press-briefing-room' }
];

export const CORRIDOR_INTERACTIONS = [...CORRIDOR_DOORS, {
    x: 370, y: 650, w: 220, h: 64, name: 'South Passage', label: 'Enter Situation Room',
    action: 'situation-room'
}];

export function canWalkCorridor(x, y) {
    return containsRoomPoint(CORRIDOR_FLOOR, x, y) &&
        !CORRIDOR_BLOCKS.some(block => containsRoomPoint(block, x, y));
}

export function getCorridorDoor(x, y) {
    if (!canWalkCorridor(x, y)) return null;
    return CORRIDOR_INTERACTIONS.find(door => containsRoomPoint(door, x, y)) ?? null;
}
