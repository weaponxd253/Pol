import assert from 'node:assert/strict';
import test from 'node:test';
import { CORRIDOR_DOORS, CORRIDOR_ENTRANCE, canWalkCorridor, getCorridorDoor } from '../js/corridor-layout.js';

test('the foot boundary blocks walls and marble bases while leaving floor beside them', () => {
  for (const [x, y] of [[11, 300], [949, 300], [480, 213], [260, 230], [290, 222], [331, 235], [420, 224]]) {
    assert.equal(canWalkCorridor(x, y), false, `expected ${x}, ${y} to be blocked`);
  }
  for (const [x, y] of [[12, 300], [948, 300], [480, 214], [260, 232], [293, 222], [331, 237], [420, 225]]) {
    assert.equal(canWalkCorridor(x, y), true, `expected ${x}, ${y} to be walkable`);
  }
});

test('the lower walls leave a walkable passage with a solid outer boundary', () => {
  assert.equal(canWalkCorridor(320, 540), true);
  assert.equal(canWalkCorridor(320, 541), false);
  assert.equal(canWalkCorridor(360, 600), false);
  assert.equal(canWalkCorridor(361, 600), true);
  assert.equal(canWalkCorridor(596, 600), true);
  assert.equal(canWalkCorridor(597, 600), false);
  assert.equal(canWalkCorridor(480, 714), true);
  assert.equal(canWalkCorridor(480, 715), false);
});

test('door prompts are reachable from the floor and scoped to their doorway', () => {
  for (const door of CORRIDOR_DOORS) {
    const center = door.x + door.w / 2;
    assert.equal(getCorridorDoor(center, 250), door);
    assert.equal(getCorridorDoor(center, 279), null);
    assert.equal(getCorridorDoor(center, 213), null);
  }
  assert.equal(getCorridorDoor(420, 235), null);
  assert.equal(getCorridorDoor(CORRIDOR_ENTRANCE.x, CORRIDOR_ENTRANCE.y)?.action, 'enter-office');
});
