import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { getRoomNpcs } from '../js/npc-content.js';
import { createRoomNpcs } from '../js/room-npcs.js';
import { IDLE_FRAMES } from '../js/room-controls.js';
import { CABINET_CORRIDOR_ENTRANCE, CORRIDOR_ENTRANCE, CORRIDOR_INTERACTIONS,
    CORRIDOR_SOUTH_ENTRANCE, PRESS_CORRIDOR_ENTRANCE, canWalkCorridor } from '../js/corridor-layout.js';
import { CABINET_ROOM_ENTRANCE, CABINET_ROOM_EXIT, canWalkCabinetRoom } from '../js/cabinet-room-layout.js';
import { PRESS_ROOM_ENTRANCE, PRESS_ROOM_EXIT, canWalkPressRoom } from '../js/press-room-layout.js';
import { SITUATION_ENTRANCE, SITUATION_INTERACTIONS, canWalkSituationRoom } from '../js/situation-room-layout.js';

const rooms = {
    GovernmentCorridorScene: { canWalk: canWalkCorridor, protectedZones: CORRIDOR_INTERACTIONS,
        entrances: [CORRIDOR_ENTRANCE, CABINET_CORRIDOR_ENTRANCE, PRESS_CORRIDOR_ENTRANCE, CORRIDOR_SOUTH_ENTRANCE] },
    CabinetRoomScene: { canWalk: canWalkCabinetRoom, protectedZones: [CABINET_ROOM_EXIT], entrances: [CABINET_ROOM_ENTRANCE] },
    PressBriefingRoomScene: { canWalk: canWalkPressRoom, protectedZones: [PRESS_ROOM_EXIT], entrances: [PRESS_ROOM_ENTRANCE] },
    SituationRoomScene: { canWalk: canWalkSituationRoom, protectedZones: SITUATION_INTERACTIONS, entrances: [SITUATION_ENTRANCE] }
};

function sprite(x, y, texture, frame) {
    return { x, y, texture, frame, depth: 0,
        anims: { playing: null, play(key) { this.playing = key; }, stop() { this.playing = null; } },
        setOrigin() { return this; }, setScale() { return this; }, setTint() { return this; },
        setVisible(visible) { this.visible = visible; return this; },
        setDepth(value) { this.depth = value; return this; },
        setFrame(value) { this.frame = value; return this; },
        setPosition(px, py) { this.x = px; this.y = py; return this; }
    };
}

function fixture(key = 'GovernmentCorridorScene', overrides = {}) {
    const sprites = [];
    const animations = new Map();
    const { entrances } = rooms[key];
    const scene = {
        sys: { settings: { key } }, lastDirection: 'down', events: new EventEmitter(),
        player: sprite(entrances[0].x, entrances[0].y, 'leader', 0),
        add: { sprite(x, y, texture, frame) { const actor = sprite(x, y, texture, frame); sprites.push(actor); return actor; } },
        anims: { exists: name => animations.has(name), create: animation => animations.set(animation.key, animation),
            generateFrameNumbers: (texture, { frames }) => frames.map(frame => ({ key: texture, frame })) }
    };
    const options = { ...rooms[key], ...overrides };
    const npcs = createRoomNpcs(scene, options);
    const aide = sprites.find(actor => actor.texture === 'npc-government-aide');
    const tick = (count = 1, delta = 50) => { for (let i = 0; i < count; i++) npcs.update(delta); };
    return { scene, sprites, animations, npcs, aide, tick, options };
}

test('hidden party leaders do not receive interactions or block the opening scenario', () => {
    const { npcs, sprites } = fixture();
    const leader = sprites.find(actor => actor.texture === 'npc-coalition-leader');
    const from = { x: leader.x - 80, y: leader.y };
    npcs.setNegotiatorsVisible(false);
    assert.equal(leader.visible, false);
    assert.equal(npcs.nearby(leader.x, leader.y), null);
    assert.equal(npcs.blocks(leader.x, leader.y, from), false);
    assert.equal(npcs.beginConversation(leader.texture), false);
    npcs.setNegotiatorsVisible(true);
    assert.equal(leader.visible, true);
    assert.equal(npcs.nearby(leader.x, leader.y).action, leader.texture);
    assert.equal(npcs.blocks(leader.x, leader.y, from), true);
});

test('the Aide patrols a complete loop with walking frames and pauses; officials stay at their posts', () => {
    const { sprites, aide, tick, animations } = fixture();
    const chief = sprites.find(actor => actor.texture === 'npc-chief-of-staff');
    const directions = new Set();
    const corners = new Set();
    let pauses = 0;
    let moving = 0;
    for (let i = 0; i < 1200; i++) {
        const previous = { x: aide.x, y: aide.y };
        tick();
        assert.ok(Math.hypot(aide.x - previous.x, aide.y - previous.y) <= 2.101);
        if (aide.anims.playing) { directions.add(aide.anims.playing); moving++; }
        else if (aide.x === previous.x && aide.y === previous.y) pauses++;
        for (const { x, y } of getRoomNpcs('GovernmentCorridorScene')[1].patrol.points) {
            if (Math.hypot(aide.x - x, aide.y - y) < 0.01) corners.add(`${x},${y}`);
        }
    }
    assert.equal(corners.size, 5);
    assert.equal(directions.size, 4);
    assert.ok(moving > 500 && pauses > 50);
    assert.deepEqual([chief.x, chief.y], [270, 370]);
    assert.equal(chief.anims.playing, null);
    for (const [direction, start] of Object.entries(IDLE_FRAMES)) {
        const animation = animations.get(`npc-government-aide-walk-${direction}`);
        assert.deepEqual(animation.frames.map(frame => frame.frame), [start + 1, start + 2, start + 3, start + 2]);
        assert.ok(animation.frames.every(frame => frame.key === 'npc-government-aide'));
    }
});

test('each official stops and faces the president in all four directions when spoken to', () => {
    for (const key of Object.keys(rooms)) {
        const { scene, sprites, npcs, tick } = fixture(key);
        tick(30);
        for (const actor of sprites) {
            for (const [direction, dx, dy] of [['right', 60, 0], ['left', -60, 0], ['up', 0, -60], ['down', 0, 60]]) {
                scene.player.setPosition(actor.x + dx, actor.y + dy);
                const positions = sprites.map(({ x, y }) => [x, y]);
                assert.equal(npcs.beginConversation(actor.texture), true);
                assert.equal(actor.frame, IDLE_FRAMES[direction]);
                assert.ok(sprites.every(item => item.anims.playing === null));
                tick(100);
                assert.deepEqual(sprites.map(({ x, y }) => [x, y]), positions);
                assert.equal(actor.frame, IDLE_FRAMES[direction]);
                npcs.endConversation();
            }
        }
    }
});

test('closing a conversation resumes the same patrol from its current position', () => {
    const { scene, aide, npcs, tick } = fixture();
    tick(35);
    const stoppedAt = { x: aide.x, y: aide.y };
    assert.ok(aide.anims.playing);
    // Room navigation buttons can start a conversation from outside talk range.
    assert.equal(npcs.beginConversation(aide.texture), true);
    assert.equal(npcs.beginConversation('unknown'), false);
    tick(50);
    assert.deepEqual([aide.x, aide.y], [stoppedAt.x, stoppedAt.y]);
    npcs.endConversation();
    scene.player.setPosition(480, 254);
    tick();
    assert.ok(aide.x > stoppedAt.x && aide.x - stoppedAt.x <= 2.101);
    assert.ok(aide.anims.playing);
});

test('the Aide yields to the president without pushing, and resumes once the route clears', () => {
    const { scene, aide, tick } = fixture();
    scene.player.setPosition(750, 350);
    tick(200);
    assert.ok(aide.x > 680 && aide.x < 714);
    assert.equal(aide.anims.playing, null);
    assert.deepEqual([scene.player.x, scene.player.y], [750, 350]);
    const stoppedX = aide.x;
    tick(20);
    assert.equal(aide.x, stoppedX);
    scene.player.setPosition(750, 410);
    tick(20);
    assert.ok(aide.x > stoppedX);
});

test('foot collisions permit passing behind a torso and escaping any existing overlap', () => {
    for (const key of Object.keys(rooms)) {
        const { sprites, npcs } = fixture(key);
        for (const actor of sprites) {
            const outside = { x: actor.x + 80, y: actor.y + 80 };
            assert.equal(npcs.blocks(actor.x, actor.y, outside), true);
            assert.equal(npcs.blocks(actor.x + 20, actor.y, outside), true);
            assert.equal(npcs.blocks(actor.x, actor.y + 20, outside), false);
            assert.equal(npcs.blocks(actor.x + 2, actor.y, { x: actor.x + 1, y: actor.y }), false);
            assert.equal(npcs.blocks(actor.x + 1, actor.y, { x: actor.x + 2, y: actor.y }), true);
            assert.equal(npcs.blocks(actor.x + 1, actor.y + 1, actor), false);
        }
    }
});

test('patrol movement respects furniture, reserved interactions, and spawn clearance', () => {
    const obstacle = { x: 730, y: 330, w: 30, h: 60 };
    const blocked = fixture('GovernmentCorridorScene', { protectedZones: [...CORRIDOR_INTERACTIONS, obstacle] });
    blocked.tick(400);
    assert.ok(blocked.aide.x <= 696 && blocked.aide.x > 680);
    assert.equal(blocked.aide.anims.playing, null);
    const wall = fixture('GovernmentCorridorScene', { canWalk: (x, y) => canWalkCorridor(x, y) && x < 720 });
    wall.tick(400);
    assert.ok(wall.aide.x < 702);
    const spawn = fixture('GovernmentCorridorScene', { entrances: [{ x: 750, y: 350 }] });
    spawn.scene.player.setPosition(480, 254);
    spawn.tick(400);
    assert.ok(spawn.aide.x <= 705);
    assert.equal(spawn.npcs.blocks(750, 350), false);
});

function reachable(canWalk, entrance) {
    const step = 8;
    const key = (x, y) => `${x},${y}`;
    const start = { x: Math.round(entrance.x / step) * step, y: Math.round(entrance.y / step) * step };
    assert.ok(canWalk(start.x, start.y));
    const seen = new Set([key(start.x, start.y)]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
        const { x, y } = queue[i];
        for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
            const id = key(x + dx, y + dy);
            if (!seen.has(id) && canWalk(x + dx, y + dy)) {
                seen.add(id);
                queue.push({ x: x + dx, y: y + dy });
            }
        }
    }
    return seen;
}

test('NPCs leave every entrance clear and cannot carve off a player pocket anywhere along the patrol', () => {
    for (const [key, room] of Object.entries(rooms)) {
        const { npcs, tick } = fixture(key);
        const origin = room.entrances[0];
        const baseline = reachable(room.canWalk, origin);
        const open = (x, y) => room.canWalk(x, y) && !npcs.blocks(x, y, origin);
        const samples = key === 'GovernmentCorridorScene' ? 30 : 1;
        for (let i = 0; i < samples; i++) {
            tick(20);
            const connected = reachable(open, origin);
            for (const entrance of room.entrances) assert.equal(npcs.blocks(entrance.x, entrance.y, origin), false);
            for (const id of baseline) {
                const [x, y] = id.split(',').map(Number);
                if (open(x, y)) assert.ok(connected.has(id), `${key}: player pocket at ${id}`);
            }
        }
    }
});

test('pause and sleep stop animations, sleep releases conversation, and shutdown cleans listeners', () => {
    const { scene, aide, npcs, tick } = fixture();
    tick(35);
    scene.events.emit('pause');
    assert.equal(aide.anims.playing, null);
    npcs.beginConversation(aide.texture);
    scene.events.emit('sleep');
    const before = aide.x;
    tick();
    assert.ok(aide.x > before);
    scene.events.emit('shutdown');
    assert.equal(scene.events.listenerCount('pause'), 0);
    assert.equal(scene.events.listenerCount('sleep'), 0);
});

test('large frame deltas do not teleport NPCs through the player or skip the patrol', () => {
    const { aide, tick } = fixture();
    tick(35);
    const previous = aide.x;
    tick(1, 5000);
    assert.ok(aide.x - previous > 0 && aide.x - previous <= 2.101);
});

test('proximity and depth follow the moving actor rather than the authored spawn', () => {
    const { aide, npcs, tick } = fixture();
    tick(120);
    assert.ok(aide.x > 780);
    assert.equal(npcs.nearby(aide.x + 40, aide.y)?.action, aide.texture);
    assert.equal(npcs.nearby(620, 350), null);
    npcs.updateDepth({ y: aide.y - 1 });
    assert.equal(aide.depth, 11);
    npcs.updateDepth({ y: aide.y + 1 });
    assert.equal(aide.depth, 9);
});
