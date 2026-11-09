import { getRoomNpcs } from './npc-content.js';
import { IDLE_FRAMES, PLAYER_FEET } from './room-controls.js';

const CLEARANCE = 16;
const footSize = npc => ({ x: npc.collisionRadius, y: npc.collisionRadius / 2 });
const separation = (x, y, other, size) => ((x - other.x) / size.x) ** 2 + ((y - other.y) / size.y) ** 2;
const facing = (dx, dy, fallback) => Math.abs(dx) + Math.abs(dy) < 0.001 ? fallback
    : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

function idle(actor) {
    actor.sprite.anims.stop();
    actor.sprite.setFrame(IDLE_FRAMES[actor.direction]);
}

function insideClearance(zone, x, y, size) {
    return x >= zone.x - size.x - CLEARANCE && x <= zone.x + zone.w + size.x + CLEARANCE &&
        y >= zone.y - size.y - CLEARANCE && y <= zone.y + zone.h + size.y + CLEARANCE;
}

export function loadRoomNpcs(scene) {
    for (const npc of getRoomNpcs(scene.sys.settings.key)) {
        if (!scene.textures.exists(npc.action)) {
            scene.load.spritesheet(npc.action, npc.asset, {
                frameWidth: npc.frameWidth,
                frameHeight: npc.frameHeight
            });
        }
    }
}

export function createRoomNpcs(scene, { canWalk, entrances = [], protectedZones = [] }) {
    const actors = [...getRoomNpcs(scene.sys.settings.key)].sort((a, b) => a.y - b.y).map(npc => ({
        npc, direction: npc.direction, speaking: false, waypoint: 0, waitMs: 0,
        interaction: { name: npc.name, label: `Speak with ${npc.name}`, action: npc.action },
        sprite: scene.add.sprite(npc.x, npc.y, npc.action, IDLE_FRAMES[npc.direction])
            .setOrigin(0.5, npc.footY / npc.frameHeight).setScale(npc.scale).setDepth(9)
    }));

    for (const { npc } of actors) {
        if (!npc.patrol) continue;
        for (const [direction, start] of Object.entries(IDLE_FRAMES)) {
            const key = `${npc.action}-walk-${direction}`;
            if (!scene.anims.exists(key)) scene.anims.create({
                key, frames: scene.anims.generateFrameNumbers(npc.action, { frames: [start + 1, start + 2, start + 3, start + 2] }),
                frameRate: 6, repeat: -1
            });
        }
    }

    function canStand(actor, x, y) {
        const size = footSize(actor.npc);
        // The layout already pads furniture for the player's feet. This extra
        // footprint leaves room around the NPC rather than wedging it in an aisle.
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
            [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) {
            if (!canWalk(x + dx * size.x, y + dy * size.y)) return false;
        }
        if (protectedZones.some(zone => insideClearance(zone, x, y, size))) return false;
        if (entrances.some(point => separation(x, y, point, {
            x: size.x + PLAYER_FEET.x + CLEARANCE, y: size.y + PLAYER_FEET.y + CLEARANCE
        }) <= 1)) return false;
        return !actors.some(other => other !== actor && separation(x, y, other.sprite, {
            x: size.x + footSize(other.npc).x + CLEARANCE,
            y: size.y + footSize(other.npc).y + CLEARANCE
        }) < 1);
    }

    function step(actor, delta, player) {
        const patrol = actor.npc.patrol;
        if (actor.speaking || !patrol) return;
        if (actor.waitMs > 0) {
            actor.waitMs = Math.max(0, actor.waitMs - delta);
            idle(actor);
            return;
        }
        const target = patrol.points[actor.waypoint];
        const dx = target.x - actor.sprite.x;
        const dy = target.y - actor.sprite.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.01) {
            actor.waypoint = (actor.waypoint + 1) % patrol.points.length;
            actor.waitMs = patrol.pauseMs;
            idle(actor);
            return;
        }
        const travel = Math.min(distance, patrol.speed * delta / 1000);
        const x = actor.sprite.x + dx / distance * travel;
        const y = actor.sprite.y + dy / distance * travel;
        const size = footSize(actor.npc);
        const personalSpace = { x: size.x + PLAYER_FEET.x + 8, y: size.y + PLAYER_FEET.y + 8 };
        const nextDistance = separation(x, y, player, personalSpace);
        // Yield rather than push the president. An existing overlap may separate.
        if (!canStand(actor, x, y) || (nextDistance < 1 && nextDistance <= separation(actor.sprite.x, actor.sprite.y, player, personalSpace))) {
            idle(actor);
            return;
        }
        actor.direction = facing(dx, dy, actor.direction);
        actor.sprite.setPosition(x, y);
        actor.sprite.anims.play(`${actor.npc.action}-walk-${actor.direction}`, true);
    }

    const controller = {
        nearby(x, y) {
            let nearest = null;
            let shortest = Infinity;
            for (const { npc, interaction, sprite } of actors) {
                const distance = Math.hypot(sprite.x - x, sprite.y - y);
                if (distance <= npc.talkRadius && distance < shortest) {
                    nearest = interaction;
                    shortest = distance;
                }
            }
            return nearest;
        },
        blocks(x, y, from = scene.player) {
            return actors.some(({ npc, sprite }) => {
                const size = footSize(npc);
                const combined = { x: size.x + PLAYER_FEET.x, y: size.y + PLAYER_FEET.y };
                const next = separation(x, y, sprite, combined);
                const previous = separation(from.x, from.y, sprite, combined);
                // Always permit escape from an overlap after a spawn or resume.
                return next < 1 && (previous >= 1 || next < previous - 0.000001);
            });
        },
        beginConversation(action, player = scene.player) {
            const actor = actors.find(item => item.npc.action === action);
            if (!actor) return false;
            controller.endConversation();
            actor.speaking = true;
            actor.previousDirection = actor.direction;
            actor.direction = facing(player.x - actor.sprite.x, player.y - actor.sprite.y, actor.direction);
            controller.pause();
            player.anims.stop();
            player.setFrame(IDLE_FRAMES[scene.lastDirection]);
            return true;
        },
        endConversation() {
            for (const actor of actors) {
                if (!actor.speaking) continue;
                actor.speaking = false;
                actor.direction = actor.previousDirection;
                idle(actor);
            }
        },
        pause() {
            for (const actor of actors) idle(actor);
        },
        update(delta, player = scene.player) {
            const elapsed = Math.max(0, Math.min(delta, 50));
            // Also enforce the speaking lock when called outside Phaser's pause.
            if (!actors.some(actor => actor.speaking)) {
                for (const actor of actors) step(actor, elapsed, player);
            }
            controller.updateDepth(player);
            controller.drawDebug();
        },
        updateDepth(player) {
            for (const { sprite } of actors) {
                const depth = player.y < sprite.y ? 11 : 9;
                if (sprite.depth !== depth) sprite.setDepth(depth);
            }
        },
        drawDebug() {
            const debug = scene.debugNpcs;
            if (!debug) return;
            debug.setVisible(scene.debugGraphics.visible).clear();
            if (!debug.visible) return;
            for (const { npc, sprite } of actors) {
                const size = footSize(npc);
                debug.lineStyle(2, 0xff3333, 1).strokeEllipse(sprite.x, sprite.y,
                    (size.x + PLAYER_FEET.x) * 2, (size.y + PLAYER_FEET.y) * 2);
                debug.lineStyle(2, 0x00ffff, 0.95).strokeCircle(sprite.x, sprite.y, npc.talkRadius);
            }
        }
    };
    const sleep = () => { controller.endConversation(); controller.pause(); };
    scene.events.on('pause', controller.pause);
    scene.events.on('sleep', sleep);
    scene.events.once('shutdown', () => {
        scene.events.off('pause', controller.pause);
        scene.events.off('sleep', sleep);
    });
    return controller;
}
