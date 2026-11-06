import assert from 'node:assert/strict';
import test from 'node:test';
import { PRESS_CORRIDOR_ENTRANCE, getCorridorDoor } from '../js/corridor-layout.js';
import { PRESS_ROOM_ENTRANCE, PRESS_ROOM_EXIT, canWalkPressRoom, getPressRoomExit } from '../js/press-room-layout.js';

test('the corridor’s north-side door and the Press Briefing Room’s south aisle connect', () => {
    const { x, y } = PRESS_CORRIDOR_ENTRANCE;
    assert.equal(getCorridorDoor(x, y).action, 'press-briefing-room');
    assert.equal(canWalkPressRoom(PRESS_ROOM_ENTRANCE.x, PRESS_ROOM_ENTRANCE.y), true);
    assert.equal(getPressRoomExit(PRESS_ROOM_ENTRANCE.x, PRESS_ROOM_ENTRANCE.y), null);
    assert.equal(getPressRoomExit(480, 690), PRESS_ROOM_EXIT);
    assert.equal(getPressRoomExit(400, 690), null);
    assert.equal(getPressRoomExit(480, 85), null);
});

test('the south aisle leads to the stage and the outer aisles connect around the seating', () => {
    for (let y = 267; y <= PRESS_ROOM_ENTRANCE.y; y++) {
        assert.equal(canWalkPressRoom(480, y), true);
    }
    for (let x = 126; x <= 832; x++) {
        assert.equal(canWalkPressRoom(x, 315), true);
        assert.equal(canWalkPressRoom(x, 548), true);
    }
    for (let y = 315; y <= 548; y++) {
        assert.equal(canWalkPressRoom(126, y), true);
        assert.equal(canWalkPressRoom(832, y), true);
    }
    for (const [x, y] of [[480, 250], [169, 290], [58, 310], [300, 350], [700, 510], [120, 650]]) {
        assert.equal(canWalkPressRoom(x, y), false);
    }
});
