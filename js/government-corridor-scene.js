import { CORRIDOR_BLOCKS, CORRIDOR_DOORS, CORRIDOR_ENTRANCE, CORRIDOR_FLOOR, canWalkCorridor, getCorridorDoor } from './corridor-layout.js';
import { bindRoomActions, createRoomPlayer, drawRoomFeet, moveRoomPlayer, placeRoomPlayer, sendRoomAction, updateRoomHud, updateRoomPrompt } from './room-controls.js';

const Phaser = window.Phaser;
const WIDTH = 960;
const HEIGHT = 720;

export class GovernmentCorridorScene extends Phaser.Scene {
    constructor() {
        super('GovernmentCorridorScene');
    }

    preload() {
        this.load.image('government-corridor', './assets/government_corridor.png');
    }

    create() {
        this.add.image(WIDTH / 2, HEIGHT / 2, 'government-corridor').setDisplaySize(WIDTH, HEIGHT);
        createRoomPlayer(this, CORRIDOR_ENTRANCE.x, CORRIDOR_ENTRANCE.y, 'down');

        this.hint = this.add.text(WIDTH / 2, HEIGHT - 8, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#fff8e9',
            backgroundColor: '#162c24',
            align: 'center',
            padding: { x: 16, y: 10 }
        }).setOrigin(0.5, 1).setDepth(30);

        this.createCollisionDebug();
        this.updateDoorPrompt();
        bindRoomActions(this,
            () => sendRoomAction(getCorridorDoor(this.player.x, this.player.y)),
            () => {
                placeRoomPlayer(this, CORRIDOR_ENTRANCE.x, CORRIDOR_ENTRANCE.y, 'down');
                this.updateDoorPrompt();
            }
        );
    }

    blocked(x, y) {
        return !canWalkCorridor(x, y);
    }

    createCollisionDebug() {
        const debug = this.add.graphics().setDepth(25).setVisible(false);
        this.debugGraphics = debug;
        this.debugFeet = this.add.graphics().setDepth(26).setVisible(false);
        const floor = CORRIDOR_FLOOR;

        debug.fillStyle(0x00ff00, 0.06);
        debug.lineStyle(3, 0xffd500, 1);
        debug.fillRect(floor.x, floor.y, floor.w, floor.h);
        debug.strokeRect(floor.x, floor.y, floor.w, floor.h);

        debug.lineStyle(2, 0xff3333, 1);
        debug.fillStyle(0xff3333, 0.18);
        for (const { x, y, w, h } of CORRIDOR_BLOCKS) {
            debug.fillRect(x, y, w, h);
            debug.strokeRect(x, y, w, h);
        }

        debug.lineStyle(2, 0x00ffff, 0.95);
        for (const { x, y, w, h } of CORRIDOR_DOORS) {
            debug.strokeRect(x, y, w, h);
        }
    }

    updateDoorPrompt() {
        const { x, y } = this.player;
        const guidance = y > 620 ? 'South passage · Closed' : 'Approach a doorway to see where it leads.';
        updateRoomPrompt(this.hint, getCorridorDoor(x, y), guidance);
    }

    update(_time, delta) {
        moveRoomPlayer(this, delta);
        drawRoomFeet(this);
        this.updateDoorPrompt();
        updateRoomHud(this.player);
    }
}
