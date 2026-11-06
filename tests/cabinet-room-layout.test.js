import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CABINET_ROOM_ENTRANCE, CABINET_ROOM_EXIT, canWalkCabinetRoom, getCabinetRoomExit
} from '../js/cabinet-room-layout.js';
import { CABINET_CORRIDOR_ENTRANCE, getCorridorDoor } from '../js/corridor-layout.js';

test('the entrance connects to a complete loop around the table and chairs', () => {
  const path = [
    [CABINET_ROOM_ENTRANCE.x, CABINET_ROOM_ENTRANCE.y],
    [480, 500], [110, 500], [110, 225], [846, 225], [846, 500], [480, 500]
  ];
  for (let i = 1; i < path.length; i++) {
    const [x, y] = path[i - 1];
    const [endX, endY] = path[i];
    const length = Math.max(Math.abs(endX - x), Math.abs(endY - y));
    for (let step = 0; step <= length; step++) {
      const px = x + (endX - x) * step / length;
      const py = y + (endY - y) * step / length;
      assert.equal(canWalkCabinetRoom(px, py), true, `blocked at ${px}, ${py}`);
    }
  }
});

test('furniture, walls and the room boundary block feet', () => {
  for (const [x, y] of [[480, 340], [264, 250], [251, 460], [151, 350], [809, 350],
    [328, 567], [634, 567], [200, 650], [750, 650], [480, 715]]) {
    assert.equal(canWalkCabinetRoom(x, y), false, `expected ${x}, ${y} to be blocked`);
  }
});

test('only the south passage exits to the corridor and the return spawn is at the Cabinet door', () => {
  const { x, y } = CABINET_ROOM_ENTRANCE;
  assert.equal(getCabinetRoomExit(x, y), null);
  assert.equal(getCabinetRoomExit(x, 680), CABINET_ROOM_EXIT);
  assert.equal(getCabinetRoomExit(200, 680), null);
  assert.equal(getCorridorDoor(CABINET_CORRIDOR_ENTRANCE.x, CABINET_CORRIDOR_ENTRANCE.y)?.action, 'cabinet-room');
});
