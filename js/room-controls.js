export const PLAYER_FEET = { x: 11, y: 6 };
export const IDLE_FRAMES = { down: 0, left: 4, right: 8, up: 12 };
const WALK_SPEED = 165;
let showCollisions = false;

export function containsRoomPoint({ x, y, w, h }, px, py) {
    return px >= x && px <= x + w && py >= y && py <= y + h;
}

export function padRoomBlock({ x, y, w, h }) {
    return {
        x: x - PLAYER_FEET.x,
        y: y - PLAYER_FEET.y,
        w: w + 2 * PLAYER_FEET.x,
        h: h + 2 * PLAYER_FEET.y
    };
}

export function createRoomCollisionDebug(scene, floor, blocks, interactions) {
    const debug = scene.add.graphics().setDepth(25).setVisible(false);
    scene.debugGraphics = debug;
    scene.debugFeet = scene.add.graphics().setDepth(26).setVisible(false);
    scene.debugNpcs = scene.add.graphics().setDepth(25).setVisible(false);

    debug.fillStyle(0x00ff00, 0.06);
    debug.lineStyle(3, 0xffd500, 1);
    debug.fillRect(floor.x, floor.y, floor.w, floor.h);
    debug.strokeRect(floor.x, floor.y, floor.w, floor.h);

    debug.lineStyle(2, 0xff3333, 1);
    debug.fillStyle(0xff3333, 0.18);
    for (const { x, y, w, h } of blocks) {
        debug.fillRect(x, y, w, h);
        debug.strokeRect(x, y, w, h);
    }

    debug.lineStyle(2, 0x00ffff, 0.95);
    for (const { x, y, w, h } of interactions) {
        debug.strokeRect(x, y, w, h);
    }
}

export function createRoomPlayer(scene, x, y, direction) {
    for (const [name, start] of Object.entries(IDLE_FRAMES)) {
        const key = `walk-${name}`;
        if (!scene.anims.exists(key)) {
            scene.anims.create({
                key,
                frames: scene.anims.generateFrameNumbers('leader', {
                    frames: [start + 1, start + 2, start + 3, start + 2]
                }),
                frameRate: 7,
                repeat: -1
            });
        }
    }

    scene.player = scene.add.sprite(x, y, 'leader', IDLE_FRAMES[direction])
        .setOrigin(0.5, 0.98).setScale(0.25).setDepth(10);
    scene.lastDirection = direction;
    scene.cursors = scene.input.keyboard.createCursorKeys();
    scene.keys = scene.input.keyboard.addKeys('W,A,S,D,E,C');
}

export function moveRoomPlayer(scene, delta) {
    const { player, cursors, keys } = scene;
    const dx = Number(cursors.right.isDown || keys.D.isDown) - Number(cursors.left.isDown || keys.A.isDown);
    const dy = Number(cursors.down.isDown || keys.S.isDown) - Number(cursors.up.isDown || keys.W.isDown);
    let moved = false;

    if (dx || dy) {
        const distance = WALK_SPEED * Math.min(delta, 50) / (1000 * Math.hypot(dx, dy));
        const x = player.x + dx * distance;
        const y = player.y + dy * distance;
        if (dx && !scene.blocked(x, player.y)) {
            player.x = x;
            moved = true;
        }
        if (dy && !scene.blocked(player.x, y)) {
            player.y = y;
            moved = true;
        }
        scene.lastDirection = dy ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
    }

    if (moved) {
        player.anims.play(`walk-${scene.lastDirection}`, true);
    } else {
        player.anims.stop();
        player.setFrame(IDLE_FRAMES[scene.lastDirection]);
    }
}

export function updateRoomPrompt(hint, interaction, defaultPrompt = '') {
    const status = interaction && window.getOfficeInteractionStatus(interaction.action);
    const prompt = interaction
        ? status.allowed
            ? `E · ${interaction.label ?? interaction.name}\n${window.getOfficeContextHint(interaction.action)}`
            : `LOCKED · ${interaction.name}\n${status.reason}`
        : defaultPrompt;

    if (hint.text !== prompt) {
        hint.setText(prompt).setColor(status && !status.allowed ? '#f3d391' : '#fff8e9');
    }
}

export function sendRoomAction(interaction) {
    if (interaction) {
        window.dispatchEvent(new CustomEvent('government:office-action', {
            detail: { action: interaction.action }
        }));
    }
}

export function placeRoomPlayer(scene, x, y, direction) {
    scene.input.keyboard.resetKeys();
    scene.lastDirection = direction;
    scene.player.setPosition(x, y);
    scene.player.anims.stop();
    scene.player.setFrame(IDLE_FRAMES[direction]);
}

export function bindRoomActions(scene, interact, activate) {
    const { CREATE, WAKE } = window.Phaser.Scenes.Events;
    const keyboard = scene.input.keyboard;
    const canUseKey = event =>
        !event.repeat && scene.sys.isActive() && document.activeElement === scene.game.canvas;

    keyboard.on('keydown-E', event => {
        if (canUseKey(event)) interact();
    });
    keyboard.on('keydown-C', event => {
        if (!canUseKey(event)) return;
        showCollisions = !showCollisions;
        showRoomDebug(scene);
    });

    const announceRoom = () => {
        showRoomDebug(scene);
        updateRoomHud(scene.player);
        window.dispatchEvent(new CustomEvent('government:room-ready', {
            detail: { key: scene.sys.settings.key }
        }));
    };
    scene.events.once(CREATE, announceRoom);
    scene.events.on(WAKE, (_systems, data) => {
        activate(data);
        announceRoom();
    });
}

function showRoomDebug(scene) {
    scene.debugGraphics.setVisible(showCollisions);
    scene.debugFeet.setVisible(showCollisions);
    scene.npcs?.drawDebug();
    drawRoomFeet(scene);
}

export function drawRoomFeet({ debugFeet, player }) {
    if (!debugFeet.visible) return;
    const { x, y } = PLAYER_FEET;
    debugFeet.clear();
    debugFeet.lineStyle(2, 0xffffff, 1);
    debugFeet.strokeRect(player.x - x, player.y - y, 2 * x, 2 * y);
    debugFeet.fillStyle(0xffffff, 1);
    debugFeet.fillCircle(player.x, player.y, 3);
}

export function updateRoomHud({ x, y }) {
    const hud = document.getElementById('presidential-hud');
    const objective = document.getElementById('presidential-objective');
    const expanded = !document.getElementById('hud-expanded').hidden;
    hud.classList.toggle('player-near', x < 300 && y < (expanded ? 680 : 360));
    objective.classList.toggle('player-near', x > 670 && y < 285);
}
