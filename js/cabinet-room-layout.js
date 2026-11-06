import { containsRoomPoint, padRoomBlock } from './room-controls.js';

// Geometry is measured against the Cabinet Room artwork at 960 × 720.
export const CABINET_ROOM_ENTRANCE = { x: 480, y: 645 };
export const CABINET_ROOM_FLOOR = { x: 12, y: 216, w: 936, h: 498 };
export const CABINET_ROOM_EXIT = {
    x: 370, y: 666, w: 220, h: 48,
    name: 'South Passage',
    label: 'Return to Government Corridor',
    action: 'exit-cabinet-room'
};

export const CABINET_ROOM_BLOCKS = [
    // North bookcases and the outer column bases.
    { x: 0, y: 190, w: 62, h: 41 },
    { x: 898, y: 190, w: 62, h: 41 },
    { x: 66, y: 194, w: 29, h: 30 },
    { x: 860, y: 194, w: 39, h: 30 },
    // Table body, rounded ends, and the chairs around it.
    { x: 208, y: 278, w: 545, h: 144 },
    { x: 174, y: 306, w: 612, h: 91 },
    { x: 239, y: 237, w: 482, h: 45 },
    { x: 226, y: 395, w: 508, h: 79 },
    { x: 129, y: 299, w: 48, h: 96 },
    { x: 783, y: 299, w: 48, h: 96 },
    // Lower walls and column caps leave the south passage open.
    { x: 0, y: 581, w: 350, h: 139 },
    { x: 610, y: 581, w: 350, h: 139 },
    { x: 307, y: 570, w: 42, h: 26 },
    { x: 609, y: 570, w: 42, h: 26 }
].map(padRoomBlock);

export function canWalkCabinetRoom(x, y) {
    return containsRoomPoint(CABINET_ROOM_FLOOR, x, y) &&
        !CABINET_ROOM_BLOCKS.some(block => containsRoomPoint(block, x, y));
}

export function getCabinetRoomExit(x, y) {
    return canWalkCabinetRoom(x, y) && containsRoomPoint(CABINET_ROOM_EXIT, x, y)
        ? CABINET_ROOM_EXIT : null;
}
