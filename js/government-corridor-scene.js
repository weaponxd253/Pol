import {
    CABINET_CORRIDOR_ENTRANCE, CORRIDOR_BLOCKS, CORRIDOR_ENTRANCE, CORRIDOR_FLOOR,
    CORRIDOR_INTERACTIONS, CORRIDOR_SOUTH_ENTRANCE, PRESS_CORRIDOR_ENTRANCE, canWalkCorridor, getCorridorDoor
} from './corridor-layout.js';
import {
    bindRoomActions, createRoomCollisionDebug, createRoomPlayer, drawRoomFeet,
    moveRoomPlayer, placeRoomPlayer, sendRoomAction, updateRoomHud, updateRoomPrompt
} from './room-controls.js';
import { createRoomNpcs, loadRoomNpcs } from './room-npcs.js';

const WIDTH = 960;
const HEIGHT = 720;
const CORRIDOR_ARRIVALS = {
    'exit-cabinet-room': CABINET_CORRIDOR_ENTRANCE,
    'exit-press-briefing': PRESS_CORRIDOR_ENTRANCE,
    'exit-situation-north': CORRIDOR_SOUTH_ENTRANCE
};

export class GovernmentCorridorScene extends window.Phaser.Scene {
    constructor() {
        super('GovernmentCorridorScene');
    }

    preload() {
        this.load.image('government-corridor', './assets/government_corridor.png');
        loadRoomNpcs(this);
    }

    create() {
        this.add.image(WIDTH / 2, HEIGHT / 2, 'government-corridor').setDisplaySize(WIDTH, HEIGHT);
        createRoomPlayer(this, CORRIDOR_ENTRANCE.x, CORRIDOR_ENTRANCE.y, 'down');
        this.npcs = createRoomNpcs(this);
        this.hint = this.add.text(WIDTH / 2, HEIGHT - 8, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#fff8e9',
            backgroundColor: '#162c24',
            align: 'center',
            padding: { x: 16, y: 10 }
        }).setOrigin(0.5, 1).setDepth(30);

        createRoomCollisionDebug(this, CORRIDOR_FLOOR, CORRIDOR_BLOCKS, CORRIDOR_INTERACTIONS);
        this.npcs.drawDebug(this.debugGraphics);
        this.updatePrompt();
        bindRoomActions(this,
            () => sendRoomAction(this.getInteraction()),
            data => {
                const entrance = CORRIDOR_ARRIVALS[data?.action] ?? CORRIDOR_ENTRANCE;
                placeRoomPlayer(this, entrance.x, entrance.y, 'down');
                this.updatePrompt();
            }
        );
    }

    blocked(x, y) {
        return !canWalkCorridor(x, y) || this.npcs.blocks(x, y);
    }

    getInteraction() {
        const { x, y } = this.player;
        return this.npcs.nearby(x, y) ?? getCorridorDoor(x, y);
    }

    updatePrompt() {
        const guidance = this.player.y > 620
            ? 'Continue south to the Situation Room.'
            : 'Approach a doorway to see where it leads.';
        updateRoomPrompt(this.hint, this.getInteraction(), guidance);
    }

    update(_time, delta) {
        moveRoomPlayer(this, delta);
        this.npcs.updateDepth(this.player);
        drawRoomFeet(this);
        this.updatePrompt();
        updateRoomHud(this.player);
    }
}
