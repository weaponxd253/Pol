import {
    CABINET_ROOM_BLOCKS, CABINET_ROOM_ENTRANCE, CABINET_ROOM_EXIT,
    CABINET_ROOM_FLOOR, canWalkCabinetRoom, getCabinetRoomExit
} from './cabinet-room-layout.js';
import {
    bindRoomActions, createRoomCollisionDebug, createRoomPlayer, drawRoomFeet,
    moveRoomPlayer, placeRoomPlayer, sendRoomAction, updateRoomHud, updateRoomPrompt
} from './room-controls.js';
import { createRoomNpcs, loadRoomNpcs } from './room-npcs.js';

const WIDTH = 960;
const HEIGHT = 720;

export class CabinetRoomScene extends window.Phaser.Scene {
    constructor() {
        super('CabinetRoomScene');
    }

    preload() {
        this.load.image('cabinet-room', './assets/cabinet_room.png');
        loadRoomNpcs(this);
    }

    create() {
        this.add.image(WIDTH / 2, HEIGHT / 2, 'cabinet-room').setDisplaySize(WIDTH, HEIGHT);
        const { x, y } = CABINET_ROOM_ENTRANCE;
        createRoomPlayer(this, x, y, 'up');
        this.npcs = createRoomNpcs(this, {
            canWalk: canWalkCabinetRoom, entrances: [CABINET_ROOM_ENTRANCE], protectedZones: [CABINET_ROOM_EXIT]
        });

        this.hint = this.add.text(WIDTH / 2, HEIGHT - 8, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#fff8e9',
            backgroundColor: '#162c24',
            align: 'center',
            padding: { x: 16, y: 10 }
        }).setOrigin(0.5, 1).setDepth(30);

        createRoomCollisionDebug(this, CABINET_ROOM_FLOOR, CABINET_ROOM_BLOCKS, [CABINET_ROOM_EXIT]);
        this.npcs.drawDebug();
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
        return !canWalkCabinetRoom(x, y) || this.npcs.blocks(x, y);
    }

    getInteraction() {
        const { x, y } = this.player;
        return getCabinetRoomExit(x, y) ?? this.npcs.nearby(x, y);
    }

    updatePrompt() {
        const interaction = this.getInteraction();
        updateRoomPrompt(this.hint, interaction);
        this.hint.setVisible(Boolean(interaction));
    }

    update(_time, delta) {
        moveRoomPlayer(this, delta);
        this.npcs.update(delta, this.player);
        drawRoomFeet(this);
        this.updatePrompt();
        updateRoomHud(this.player);
    }
}
