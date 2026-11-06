import { containsRoomPoint, padRoomBlock } from './room-controls.js';

// Coordinates are measured against the Press Briefing Room artwork at 960 × 720.
export const PRESS_ROOM_ENTRANCE = { x: 480, y: 645 };
export const PRESS_ROOM_FLOOR = { x: 12, y: 224, w: 936, h: 490 };
export const PRESS_ROOM_EXIT = {
    x: 430, y: 670, w: 100, h: 44,
    name: 'South Passage',
    label: 'Return to Government Corridor',
    action: 'exit-press-briefing'
};

export const PRESS_ROOM_BLOCKS = [
    // The stage is accessible through its center steps.
    { x: 0, y: 0, w: 236, h: 246 },
    { x: 724, y: 0, w: 236, h: 246 },
    { x: 237, y: 251, w: 85, h: 35 },
    { x: 638, y: 251, w: 86, h: 35 },
    { x: 438, y: 172, w: 83, h: 85 },
    { x: 252, y: 201, w: 45, h: 41 },
    { x: 663, y: 201, w: 48, h: 41 },
    { x: 346, y: 208, w: 41, h: 17 },
    { x: 572, y: 208, w: 42, h: 17 },
    // Side workstations and camera stands.
    { x: 0, y: 241, w: 112, h: 114 },
    { x: 847, y: 241, w: 113, h: 114 },
    { x: 139, y: 275, w: 62, h: 25 },
    { x: 759, y: 275, w: 61, h: 25 },
    { x: 0, y: 379, w: 22, h: 75 },
    { x: 938, y: 379, w: 22, h: 75 },
    // Audience seating leaves the center and outer aisles clear.
    { x: 169, y: 327, w: 250, h: 63 },
    { x: 157, y: 388, w: 260, h: 64 },
    { x: 144, y: 454, w: 273, h: 74 },
    { x: 543, y: 327, w: 248, h: 63 },
    { x: 543, y: 388, w: 261, h: 64 },
    { x: 546, y: 454, w: 270, h: 74 },
    // The south walls and column caps frame the entrance aisle.
    { x: 0, y: 583, w: 352, h: 137 },
    { x: 608, y: 583, w: 352, h: 137 },
    { x: 17, y: 570, w: 47, h: 24 },
    { x: 307, y: 562, w: 45, h: 26 },
    { x: 607, y: 562, w: 45, h: 26 },
    { x: 902, y: 570, w: 46, h: 24 }
].map(padRoomBlock);

export function canWalkPressRoom(x, y) {
    return containsRoomPoint(PRESS_ROOM_FLOOR, x, y) &&
        !PRESS_ROOM_BLOCKS.some(block => containsRoomPoint(block, x, y));
}

export function getPressRoomExit(x, y) {
    return canWalkPressRoom(x, y) && containsRoomPoint(PRESS_ROOM_EXIT, x, y) ? PRESS_ROOM_EXIT : null;
}
