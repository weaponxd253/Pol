import {
    PRESS_ROOM_BLOCKS, PRESS_ROOM_ENTRANCE, PRESS_ROOM_EXIT,
    PRESS_ROOM_FLOOR, canWalkPressRoom, getPressRoomExit
} from './press-room-layout.js';
import {
    bindRoomActions, createRoomCollisionDebug, createRoomPlayer, drawRoomFeet,
    moveRoomPlayer, placeRoomPlayer, sendRoomAction, updateRoomHud, updateRoomPrompt
} from './room-controls.js';
import { createRoomNpcs, loadRoomNpcs } from './room-npcs.js';

const WIDTH = 960;
const HEIGHT = 720;

export class PressBriefingRoomScene extends window.Phaser.Scene {
    constructor() {
        super('PressBriefingRoomScene');
    }

    preload() {
        this.load.image('press-briefing-room', './assets/press_briefing_room.png');
        loadRoomNpcs(this);
    }

    create() {
        this.add.image(WIDTH / 2, HEIGHT / 2, 'press-briefing-room').setDisplaySize(WIDTH, HEIGHT);
        const { x, y } = PRESS_ROOM_ENTRANCE;
        createRoomPlayer(this, x, y, 'up');
        this.npcs = createRoomNpcs(this);
        this.hint = this.add.text(WIDTH / 2, HEIGHT - 8, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#fff8e9',
            backgroundColor: '#162c24',
            align: 'center',
            padding: { x: 16, y: 10 }
        }).setOrigin(0.5, 1).setDepth(30);

        createRoomCollisionDebug(this, PRESS_ROOM_FLOOR, PRESS_ROOM_BLOCKS, [PRESS_ROOM_EXIT]);
        this.npcs.drawDebug(this.debugGraphics);
        this.updatePrompt();
        bindRoomActions(this,
            () => sendRoomAction(this.getInteraction()),
            () => {
                placeRoomPlayer(this, x, y, 'up');
                this.updatePrompt();
            }
        );
    }

    blocked(x, y) {
        return !canWalkPressRoom(x, y) || this.npcs.blocks(x, y);
    }

    getInteraction() {
        const { x, y } = this.player;
        return this.npcs.nearby(x, y) ?? getPressRoomExit(x, y);
    }

    updatePrompt() {
        const interaction = this.getInteraction();
        updateRoomPrompt(this.hint, interaction);
        this.hint.setVisible(Boolean(interaction));
    }

    update(_time, delta) {
        moveRoomPlayer(this, delta);
        this.npcs.updateDepth(this.player);
        drawRoomFeet(this);
        this.updatePrompt();
        updateRoomHud(this.player);
    }
}
