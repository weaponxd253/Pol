import {
    PRESS_ROOM_BLOCKS, PRESS_ROOM_ENTRANCE, PRESS_ROOM_EXIT,
    PRESS_ROOM_FLOOR, canWalkPressRoom, getPressRoomExit
} from './press-room-layout.js';
import {
    bindRoomActions, createRoomCollisionDebug, createRoomPlayer, drawRoomFeet,
    moveRoomPlayer, placeRoomPlayer, sendRoomAction, updateRoomHud, updateRoomPrompt
} from './room-controls.js';

const WIDTH = 960;
const HEIGHT = 720;

export class PressBriefingRoomScene extends window.Phaser.Scene {
    constructor() {
        super('PressBriefingRoomScene');
    }

    preload() {
        this.load.image('press-briefing-room', './assets/press_briefing_room.png');
    }

    create() {
        this.add.image(WIDTH / 2, HEIGHT / 2, 'press-briefing-room').setDisplaySize(WIDTH, HEIGHT);
        const { x, y } = PRESS_ROOM_ENTRANCE;
        createRoomPlayer(this, x, y, 'up');
        this.hint = this.add.text(WIDTH / 2, HEIGHT - 8, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#fff8e9',
            backgroundColor: '#162c24',
            align: 'center',
            padding: { x: 16, y: 10 }
        }).setOrigin(0.5, 1).setDepth(30);

        createRoomCollisionDebug(this, PRESS_ROOM_FLOOR, PRESS_ROOM_BLOCKS, [PRESS_ROOM_EXIT]);
        this.updateExitPrompt();
        bindRoomActions(this,
            () => sendRoomAction(getPressRoomExit(this.player.x, this.player.y)),
            () => {
                placeRoomPlayer(this, x, y, 'up');
                this.updateExitPrompt();
            }
        );
    }

    blocked(x, y) {
        return !canWalkPressRoom(x, y);
    }

    updateExitPrompt() {
        const exit = getPressRoomExit(this.player.x, this.player.y);
        updateRoomPrompt(this.hint, exit);
        this.hint.setVisible(Boolean(exit));
    }

    update(_time, delta) {
        moveRoomPlayer(this, delta);
        drawRoomFeet(this);
        this.updateExitPrompt();
        updateRoomHud(this.player);
    }
}
