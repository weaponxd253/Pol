import { getRoomNpcs } from './npc-content.js';
import { IDLE_FRAMES } from './room-controls.js';

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

export function createRoomNpcs(scene) {
    const actors = [...getRoomNpcs(scene.sys.settings.key)].sort((a, b) => a.y - b.y).map(npc => ({
        npc,
        interaction: { name: npc.name, label: `Speak with ${npc.name}`, action: npc.action },
        sprite: scene.add.sprite(npc.x, npc.y, npc.action, IDLE_FRAMES[npc.direction])
            .setOrigin(0.5, npc.footY / npc.frameHeight).setScale(npc.scale).setDepth(9)
    }));

    return {
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
        blocks(x, y) {
            return actors.some(({ npc, sprite }) =>
                Math.hypot(sprite.x - x, sprite.y - y) < npc.collisionRadius);
        },
        updateDepth(player) {
            for (const { sprite } of actors) {
                const depth = player.y < sprite.y ? 11 : 9;
                if (sprite.depth !== depth) sprite.setDepth(depth);
            }
        },
        drawDebug(debug) {
            for (const { npc, sprite } of actors) {
                debug.lineStyle(2, 0xff3333, 1).strokeCircle(sprite.x, sprite.y, npc.collisionRadius);
                debug.lineStyle(2, 0x00ffff, 0.95).strokeCircle(sprite.x, sprite.y, npc.talkRadius);
            }
        }
    };
}
