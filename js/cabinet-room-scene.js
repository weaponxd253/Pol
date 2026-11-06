import {
    CABINET_ROOM_BLOCKS, CABINET_ROOM_ENTRANCE, CABINET_ROOM_EXIT,
    CABINET_ROOM_FLOOR, canWalkCabinetRoom, getCabinetRoomExit
} from './cabinet-room-layout.js';
import {
    bindRoomActions, createRoomCollisionDebug, createRoomPlayer, drawRoomFeet,
    moveRoomPlayer, placeRoomPlayer, sendRoomAction, updateRoomHud, updateRoomPrompt
} from './room-controls.js';

const WIDTH = 960;
const HEIGHT = 720;

export class CabinetRoomScene extends window.Phaser.Scene {
    constructor() {
        super('CabinetRoomScene');
    }

    preload() {
        this.load.image('cabinet-room', './assets/cabinet_room.png');
    }

    create() {
        this.add.image(WIDTH / 2, HEIGHT / 2, 'cabinet-room').setDisplaySize(WIDTH, HEIGHT);
        const { x, y } = CABINET_ROOM_ENTRANCE;
        createRoomPlayer(this, x, y, 'up');

        this.hint = this.add.text(WIDTH / 2, HEIGHT - 8, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#fff8e9',
            backgroundColor: '#162c24',
            align: 'center',
            padding: { x: 16, y: 10 }
        }).setOrigin(0.5, 1).setDepth(30);

        createRoomCollisionDebug(this, CABINET_ROOM_FLOOR, CABINET_ROOM_BLOCKS, [CABINET_ROOM_EXIT]);
        this.updateExitPrompt();
        bindRoomActions(this,
            () => sendRoomAction(getCabinetRoomExit(this.player.x, this.player.y)),
            () => {
                placeRoomPlayer(this, x, y, 'up');
                this.updateExitPrompt();
            }
        );
    }

    blocked(x, y) {
        return !canWalkCabinetRoom(x, y);
    }

    updateExitPrompt() {
        const { x, y } = this.player;
        const exit = getCabinetRoomExit(x, y);
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
