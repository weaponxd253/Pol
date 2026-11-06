import { PLAYER_FEET, bindRoomActions, createRoomPlayer, drawRoomFeet, moveRoomPlayer, placeRoomPlayer, sendRoomAction, updateRoomHud, updateRoomPrompt } from './room-controls.js';

const Phaser = window.Phaser;

const WIDTH = 960;
const HEIGHT = 720;
const CORRIDOR_RETURN = { x: 480, y: 625 };

const ROOM_BOUNDS = {
    left: 28,
    right: 930,

    // Side areas: archives and cabinets
    sideTop: 205,

    // Center: approach executive desk
    centerLeft: 300,
    centerRight: 650,
    centerTop: 205,

    // Bottom boundary and office door
    bottom: 633,
    doorLeft: 434,
    doorRight: 514,
    doorBottom: 639,

    // Player's collision footprint
    radiusX: PLAYER_FEET.x,
    radiusY: PLAYER_FEET.y
};

function getTopBoundary(x) {
    const b = ROOM_BOUNDS;

    return x >= b.centerLeft && x <= b.centerRight
        ? b.centerTop
        : b.sideTop;
}

function getBottomBoundary(x) {
    const b = ROOM_BOUNDS;

    return x >= b.doorLeft && x <= b.doorRight
        ? b.doorBottom
        : b.bottom;
}

// Furniture collision areas, based on a 960x720 room.
const OBSTACLES = [
    { x: 33, y: 69, w: 135, h: 257 },   // Bookshelves
    { x: 751, y: 66, w: 149, h: 169 },  // File cabinet
    { x: 357, y: 230, w: 227, h: 117 }, // Executive desk
    { x: 313, y: 366, w: 86, h: 153 },  // Left sofa
    { x: 548, y: 365, w: 77, h: 156 },  // Right sofa
    { x: 425, y: 395, w: 83, h: 109 },  // Coffee table
    { x: 437, y: 502, w: 77, h: 66 },   // Guest chair
    { x: 758, y: 305, w: 116, h: 200 }, // Briefing table
    { x: 70, y: 376, w: 62, h: 164 },   // Sideboard
    { x: 36, y: 514, w: 59, h: 83 },    // Left plant
    { x: 860, y: 508, w: 58, h: 85 }    // Right plant
];

// Interactive locations in the office.
const INTERACTIONS = [
    {
        name: 'National Policy Desk',
        x: 480,
        y: 347,
        radius: 70,
        action: 'national-policies'
    },
    {
        name: 'Cabinet Briefing Table',
        x: 720,
        y: 421,
        radius: 68,
        action: 'cabinet-briefing'
    },
    {
        name: 'Government Archives',
        x: 202,
        y: 205,
        radius: 69,
        action: 'archives'
    },
    {
        name: 'Advisor Meeting Area',
        x: 479,
        y: 588,
        radius: 56,
        action: 'advisors'
    },
    {
        name: 'Office Door',
        label: 'Enter Government Corridor',
        x: 480,
        y: 639,
        radius: 36,
        action: 'exit-office'
    }
];

export class OfficeScene extends Phaser.Scene {

    constructor() {
        super('OfficeScene');

    }

    preload() {

        // Executive office background.
        this.load.image(
            'office',
            './assets/office.png'
        );

        // 4 columns x 4 rows.
        // Each frame is 192x288.
        this.load.spritesheet(
            'leader',
            './assets/prez.png',
            {
                frameWidth: 192,
                frameHeight: 288
            }
        );
    }

    create() {

        // Office background.
        this.add.image(
            WIDTH / 2,
            HEIGHT / 2,
            'office'
        ).setDisplaySize(WIDTH, HEIGHT);

        createRoomPlayer(this, 480, 610, 'up');

        // Interaction prompt.
        this.hint = this.add.text(
            WIDTH / 2,
            712,
            '',
            {
                fontSize: '14px',
                color: '#fff8e9',
                backgroundColor: '#162c24',
                align: 'center',
                padding: {
                    x: 16,
                    y: 10
                },
                wordWrap: {
                    width: 600,
                    useAdvancedWrap: true
                }
            }
        )
            .setOrigin(0.5, 1)
            .setDepth(30);


        // ==========================================
        // PHASE 5B.3 - OBJECTIVE MARKER
        // ==========================================

        this.objectiveMarker = this.add.text(
            0,
            0,
            '◆',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '25px',
                color: '#f0cd79',
                stroke: '#173f36',
                strokeThickness: 4
            }
        )
            .setOrigin(0.5)
            .setDepth(28)
            .setVisible(false);



        const b = ROOM_BOUNDS;

        this.debugGraphics = this.add.graphics()
            .setDepth(25)
            .setVisible(false);

        // Exact outline of the walkable room.
        // The shape includes the center desk restriction
        // and the bottom doorway.
        const points = [
            [b.left, b.sideTop],
            [b.centerLeft, b.sideTop],
            [b.centerLeft, b.centerTop],
            [b.centerRight, b.centerTop],
            [b.centerRight, b.sideTop],
            [b.right, b.sideTop],
            [b.right, b.bottom],
            [b.doorRight, b.bottom],
            [b.doorRight, b.doorBottom],
            [b.doorLeft, b.doorBottom],
            [b.doorLeft, b.bottom],
            [b.left, b.bottom]
        ];

        // Green interior and yellow boundary.
        this.debugGraphics.fillStyle(0x00ff00, 0.06);
        this.debugGraphics.lineStyle(3, 0xffd500, 1);

        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(points[0][0], points[0][1]);

        for (let i = 1; i < points.length; i++) {
            this.debugGraphics.lineTo(
                points[i][0],
                points[i][1]
            );
        }

        this.debugGraphics.closePath();
        this.debugGraphics.fillPath();
        this.debugGraphics.strokePath();

        // Red furniture collision zones.
        // Include the SAME padding as blocked().
        this.debugGraphics.lineStyle(2, 0xff3333, 1);
        this.debugGraphics.fillStyle(0xff3333, 0.18);

        for (const o of OBSTACLES) {
            const x = o.x - b.radiusX;
            const y = o.y - b.radiusY;
            const w = o.w + b.radiusX * 2;
            const h = o.h + b.radiusY * 2;

            this.debugGraphics.fillRect(x, y, w, h);
            this.debugGraphics.strokeRect(x, y, w, h);
        }

        // Cyan interaction zones.
        this.debugGraphics.lineStyle(2, 0x00ffff, 0.95);

        for (const interaction of INTERACTIONS) {
            this.debugGraphics.strokeCircle(
                interaction.x,
                interaction.y,
                interaction.radius
            );
        }

        // Separate graphic for player feet.
        this.debugFeet = this.add.graphics()
            .setDepth(26)
            .setVisible(false);

        this.updateInteraction();
        bindRoomActions(this,
            () => sendRoomAction(this.getNearbyInteraction()),
            () => {
                placeRoomPlayer(this, CORRIDOR_RETURN.x, CORRIDOR_RETURN.y, 'up');
                this.updateInteraction();
            }
        );
    }

    blocked(x, y) {
        const b = ROOM_BOUNDS;

        if (
            x < b.left ||
            x > b.right ||
            y < getTopBoundary(x) ||
            y > getBottomBoundary(x)
        ) {
            return true;
        }

        return OBSTACLES.some(o =>
            x > o.x - b.radiusX &&
            x < o.x + o.w + b.radiusX &&
            y > o.y - b.radiusY &&
            y < o.y + o.h + b.radiusY
        );
    }

    getNearbyInteraction() {
        let nearest = null;
        let nearestDistance = Infinity;
        for (const interaction of INTERACTIONS) {
            const distance = Math.hypot(this.player.x - interaction.x, this.player.y - interaction.y);
            if (distance <= interaction.radius && distance < nearestDistance) {
                nearest = interaction;
                nearestDistance = distance;
            }
        }
        return nearest;
    }

    updateInteraction() {
        updateRoomPrompt(this.hint, this.getNearbyInteraction());
    }

    update(time, delta) {
        moveRoomPlayer(this, delta);
        drawRoomFeet(this);
        this.updateInteraction();
        updateRoomHud(this.player);

        const objectiveAction =
            window.getOfficeObjectiveAction?.();

        const objectiveTarget = INTERACTIONS.find(
            interaction =>
                interaction.action === objectiveAction
        );

        if (objectiveTarget) {

            const floatOffset =
                Math.sin(time / 300) * 4;

            this.objectiveMarker.setPosition(
                objectiveTarget.x,
                objectiveTarget.y - 35 + floatOffset
            );

            this.objectiveMarker.setVisible(true);

        } else {

            this.objectiveMarker.setVisible(false);

        }
    }
}
