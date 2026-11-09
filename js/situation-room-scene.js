import {
    SITUATION_ENTRANCE, SITUATION_BLOCKS, SITUATION_INTERACTIONS, SITUATION_ROOM_FLOOR,
    SITUATION_STATIONS, canWalkSituationRoom, getSituationInteraction
} from './situation-room-layout.js';
import {
    bindRoomActions, createRoomCollisionDebug, createRoomPlayer, drawRoomFeet,
    moveRoomPlayer, placeRoomPlayer, sendRoomAction, updateRoomHud, updateRoomPrompt
} from './room-controls.js';
import { createRoomNpcs, loadRoomNpcs } from './room-npcs.js';

const WIDTH = 960;
const HEIGHT = 720;

export class SituationRoomScene extends window.Phaser.Scene {
    constructor() {
        super('SituationRoomScene');
    }

    preload() {
        this.load.image('situation-room', './assets/situation_room.png');
        loadRoomNpcs(this);
    }

    create() {
        this.add.image(WIDTH / 2, HEIGHT / 2, 'situation-room').setDisplaySize(WIDTH, HEIGHT);
        const { x, y } = SITUATION_ENTRANCE;
        createRoomPlayer(this, x, y, 'down');
        this.npcs = createRoomNpcs(this, {
            canWalk: canWalkSituationRoom, entrances: [SITUATION_ENTRANCE], protectedZones: SITUATION_INTERACTIONS
        });

        this.hint = this.add.text(WIDTH / 2, HEIGHT - 8, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#fff8e9',
            backgroundColor: '#162c24',
            align: 'center',
            padding: { x: 16, y: 10 }
        }).setOrigin(0.5, 1).setDepth(30);

        for (const station of SITUATION_STATIONS) {
            this.add.text(station.x + station.w / 2, station.y + 8, '◆', {
                fontSize: '17px', color: '#83f4ea', stroke: '#123f3b', strokeThickness: 4
            }).setOrigin(0.5).setDepth(5);
        }

        createRoomCollisionDebug(this, SITUATION_ROOM_FLOOR, SITUATION_BLOCKS, SITUATION_INTERACTIONS);
        this.npcs.drawDebug();
        this.updateStationPrompt();
        bindRoomActions(this,
            () => sendRoomAction(this.getInteraction()),
            () => {
                placeRoomPlayer(this, x, y, 'down');
                this.updateStationPrompt();
            }
        );
    }

    blocked(x, y) {
        return !canWalkSituationRoom(x, y) || this.npcs.blocks(x, y);
    }

    getInteraction() {
        const { x, y } = this.player;
        return getSituationInteraction(x, y) ?? this.npcs.nearby(x, y);
    }

    updateStationPrompt() {
        const guidance = this.player.y > 665 ? 'Return to the Government Corridor through the north opening.'
            : 'Approach a marked station or the north opening.';
        updateRoomPrompt(this.hint, this.getInteraction(), guidance);
    }

    update(_time, delta) {
        moveRoomPlayer(this, delta);
        this.npcs.update(delta, this.player);
        drawRoomFeet(this);
        this.updateStationPrompt();
        updateRoomHud(this.player);
    }
}
