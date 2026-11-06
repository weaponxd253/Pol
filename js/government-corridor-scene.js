import {
    CABINET_CORRIDOR_ENTRANCE, CORRIDOR_BLOCKS, CORRIDOR_ENTRANCE, CORRIDOR_FLOOR,
    CORRIDOR_INTERACTIONS, CORRIDOR_SOUTH_ENTRANCE, PRESS_CORRIDOR_ENTRANCE, canWalkCorridor, getCorridorDoor
} from './corridor-layout.js';
import { bindRoomActions, createRoomCollisionDebug, createRoomPlayer, drawRoomFeet, moveRoomPlayer, placeRoomPlayer, sendRoomAction, updateRoomHud, updateRoomPrompt } from './room-controls.js';

const Phaser = window.Phaser;
const WIDTH = 960;
const HEIGHT = 720;
const CORRIDOR_ARRIVALS = {
    'exit-cabinet-room': CABINET_CORRIDOR_ENTRANCE,
    'exit-press-briefing': PRESS_CORRIDOR_ENTRANCE,
    'exit-situation-north': CORRIDOR_SOUTH_ENTRANCE
};
const CHIEF_FRAME_WIDTH = 256;
const CHIEF_FRAME_HEIGHT = 384;
const CHIEF_FOOT_Y = 340;

export class GovernmentCorridorScene extends Phaser.Scene {
    constructor() {
        super('GovernmentCorridorScene');
    }

    preload() {
        this.load.image('government-corridor', './assets/government_corridor.png');

        // ======================================
        // PHASE 6.3.1 - CHIEF OF STAFF
        // ======================================

        // The Chief of Staff has a 4 × 4 sheet at 1024 × 1536.
        if (!this.textures.exists('chief-of-staff')) {

            this.load.spritesheet(
                'chief-of-staff',
                './assets/chief_of_staff.png',
                {
                    frameWidth: CHIEF_FRAME_WIDTH,
                    frameHeight: CHIEF_FRAME_HEIGHT
                }
            );
        }

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


        // ======================================
        // PHASE 6.3.1 - NPC DIALOGUE WINDOW
        // ======================================

        // Create a dialogue container near the bottom
        // of the Phaser screen.
        this.chiefDialogue = this.add.container(480, 585);

        // Dark government-style dialogue background.
        const dialogueBackground = this.add.rectangle(
            0,
            0,
            760,
            150,
            0x132b24,
            0.97
        );

        dialogueBackground.setStrokeStyle(
            2,
            0xc3a468
        );

        // Speaker name.
        const speakerName = this.add.text(
            -350,
            -57,
            'CHIEF OF STAFF',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '18px',
                fontStyle: 'bold',
                color: '#ebcf94'
            }
        );

        // Dialogue message.
        const dialogueText = this.add.text(
            -350,
            -22,
            'The administration is at work, President. ' +
            'Check your Current Objective panel for ' +
            'your next government responsibility.',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '16px',
                color: '#f4eedf',
                wordWrap: {
                    width: 690
                },
                lineSpacing: 5
            }
        );

        // Instructions for closing.
        const dialogueFooter = this.add.text(
            350,
            51,
            'E · Close',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '13px',
                color: '#d1b67a'
            }
        ).setOrigin(1, 0.5);

        // Assemble the dialogue window.
        this.chiefDialogue.add([
            dialogueBackground,
            speakerName,
            dialogueText,
            dialogueFooter
        ]);

        // Keep dialogue above characters and furniture.
        this.chiefDialogue.setDepth(100);

        // Start with it hidden.
        this.chiefDialogue.setVisible(false);


        createRoomCollisionDebug(this, CORRIDOR_FLOOR, CORRIDOR_BLOCKS, CORRIDOR_INTERACTIONS);
        this.updateDoorPrompt();

        bindRoomActions(
            this,

            // E-key interaction.
            // Check NPCs before checking doors.
            () => this.handleRoomInteraction(),

            // When returning to the corridor.
            data => {
                const entrance = CORRIDOR_ARRIVALS[data?.action] ?? CORRIDOR_ENTRANCE;
                placeRoomPlayer(this, entrance.x, entrance.y, 'down');

                // Reset any open NPC conversation.
                this.chiefDialogueOpen = false;
                this.chiefDialogue.setVisible(false);

                this.updateDoorPrompt();
            }
        );



        // ======================================
        // PHASE 6.3.1 - SPAWN CHIEF OF STAFF
        // ======================================

        // Position in the corridor, away from
        // the Executive Office entrance.

        this.chiefOfStaff = this.add.sprite(
            270,
            370,
            'chief-of-staff',
            0
        )
            .setOrigin(0.5, CHIEF_FOOT_Y / CHIEF_FRAME_HEIGHT)
            .setScale(0.22)
            .setDepth(8);

        // Stationary NPC faces downward.
        this.chiefOfStaff.setFrame(0);

        // No conversation is open initially.
        this.chiefDialogueOpen = false;



        // ======================================
        // PHASE 6.3.1 - NPC ANIMATIONS
        // ======================================

        const chiefDirections = {
            down: 0,
            left: 4,
            right: 8,
            up: 12
        };

        for (const [direction, start] of Object.entries(chiefDirections)) {

            const animationKey = `chief-walk-${direction}`;

            // Prevent duplicate animation registration.
            if (!this.anims.exists(animationKey)) {

                this.anims.create({
                    key: animationKey,

                    frames: this.anims.generateFrameNumbers(
                        'chief-of-staff',
                        {
                            frames: [
                                start + 1,
                                start + 2,
                                start + 3,
                                start + 2
                            ]
                        }
                    ),

                    frameRate: 7,
                    repeat: -1
                });
            }
        }

    }


    // ======================================
    // PHASE 6.3.1 - NPC PROXIMITY
    // ======================================

    isNearChiefOfStaff() {

        if (!this.player || !this.chiefOfStaff) {
            return false;
        }

        const distance = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            this.chiefOfStaff.x,
            this.chiefOfStaff.y
        );

        return distance <= 85;
    }

    // ======================================
    // PHASE 6.3.1 - ROOM INTERACTION MANAGER
    // ======================================

    handleRoomInteraction() {

        // ==================================
        // CLOSE AN OPEN CONVERSATION
        // ==================================

        if (this.chiefDialogueOpen) {

            this.chiefDialogueOpen = false;
            this.chiefDialogue.setVisible(false);

            this.updateDoorPrompt();
            return;
        }

        // ==================================
        // SPEAK WITH CHIEF OF STAFF
        // ==================================

        if (this.isNearChiefOfStaff()) {

            // Stop the president walking.
            this.player.anims.stop();

            // Open NPC dialogue.
            this.chiefDialogueOpen = true;
            this.chiefDialogue.setVisible(true);

            this.updateDoorPrompt();
            return;
        }

        // ==================================
        // EXISTING DOOR INTERACTIONS
        // ==================================

        // Preserve the door behavior from
        // Phase 6.2 when no NPC is nearby.

        sendRoomAction(
            getCorridorDoor(
                this.player.x,
                this.player.y
            )
        );
    }

    blocked(x, y) {

        // Respect existing corridor collision geometry.
        if (!canWalkCorridor(x, y)) {
            return true;
        }

        // Add Chief of Staff collision.
        if (this.chiefOfStaff) {

            const distance = Phaser.Math.Distance.Between(
                x,
                y,
                this.chiefOfStaff.x,
                this.chiefOfStaff.y
            );

            // Prevent overlapping the NPC.
            if (distance < 32) {
                return true;
            }
        }

        return false;
    }


    updateDoorPrompt() {

        if (!this.player) {
            return;
        }

        // ==================================
        // ACTIVE NPC CONVERSATION
        // ==================================

        if (this.chiefDialogueOpen) {

            this.hint.setText(
                'E · Close conversation'
            );

            return;
        }

        // ==================================
        // CHIEF OF STAFF NEARBY
        // ==================================

        if (this.isNearChiefOfStaff()) {

            this.hint.setText(
                'E · Speak with Chief of Staff'
            );

            return;
        }

        // ==================================
        // EXISTING CORRIDOR DOORS
        // ==================================

        const { x, y } = this.player;

        const guidance = y > 620
            ? 'Continue south to the Situation Room.'
            : 'Approach a doorway to see where it leads.';

        updateRoomPrompt(
            this.hint,
            getCorridorDoor(x, y),
            guidance
        );
    }

    update(_time, delta) {

        // ==================================
        // PLAYER MOVEMENT
        // ==================================

        if (!this.chiefDialogueOpen) {

            // Normal walking when no dialogue is open.
            moveRoomPlayer(this, delta);

        } else {

            // Freeze walking animation during dialogue.
            this.player.anims.stop();
        }

        // ==================================
        // EXISTING ROOM SYSTEMS
        // ==================================

        drawRoomFeet(this);

        // Update door or NPC interaction guidance.
        this.updateDoorPrompt();

        // Keep Phase 5 HUD behavior working.
        updateRoomHud(this.player);
    }

}
