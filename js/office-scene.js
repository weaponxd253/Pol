
const Phaser = window.Phaser;

const WIDTH = 960;
const HEIGHT = 720;
const WALK_SPEED = 165;

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
    doorLeft: 422,
    doorRight: 525,
    doorBottom: 673,

    // Player's collision footprint
    radiusX: 11,
    radiusY: 6
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
        x: 480,
        y: 662,
        radius: 52,
        action: 'exit-office'
    }
];

export class OfficeScene extends Phaser.Scene {

    constructor() {
        super('OfficeScene');

        this.lastDirection = 'up';
        this.nearby = null;
        this.player = null;
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

        // Walking animations.
        // Row 1: down
        // Row 2: left
        // Row 3: right
        // Row 4: up
        const directions = {
            down: 0,
            left: 4,
            right: 8,
            up: 12
        };

        for (const [direction, start] of Object.entries(directions)) {

            const key = `walk-${direction}`;

            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames: this.anims.generateFrameNumbers(
                        'leader',
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

        // Player starts near the office entrance.
        this.player = this.add.sprite(
            480,
            610,
            'leader',
            12
        )
            .setOrigin(0.5, 0.98)
            .setScale(0.25)
            .setDepth(10);

        // Keyboard movement.
        this.cursors = this.input.keyboard.createCursorKeys();

        this.keys = this.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            e: Phaser.Input.Keyboard.KeyCodes.E,
            c: Phaser.Input.Keyboard.KeyCodes.C
        });

        // Prevent arrows from scrolling the browser.
        this.input.keyboard.addCapture([
            Phaser.Input.Keyboard.KeyCodes.UP,
            Phaser.Input.Keyboard.KeyCodes.DOWN,
            Phaser.Input.Keyboard.KeyCodes.LEFT,
            Phaser.Input.Keyboard.KeyCodes.RIGHT
        ]);

        // Interaction prompt.
        this.hint = this.add.text(
            WIDTH / 2,
            712,
            '',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '17px',
                color: '#fff8e9',
                backgroundColor: '#162c24',
                padding: {
                    x: 12,
                    y: 8
                }
            }
        )
            .setOrigin(0.5, 1)
            .setDepth(30);


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

        // C toggles all debugging visuals.
        this.input.keyboard.on('keydown-C', () => {
            const visible = !this.debugGraphics.visible;

            this.debugGraphics.setVisible(visible);
            this.debugFeet.setVisible(visible);
        });


        // E interacts with nearby objects.
        this.input.keyboard.on('keydown-E', () => {
            if (this.nearby) {
                this.openInteraction(this.nearby);
            }
        });
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

    update(_time, delta) {

        if (!this.player) {
            return;
        }

        // Horizontal input.
        let dx =
            Number(
                this.cursors.right.isDown ||
                this.keys.d.isDown
            ) -
            Number(
                this.cursors.left.isDown ||
                this.keys.a.isDown
            );

        // Vertical input.
        let dy =
            Number(
                this.cursors.down.isDown ||
                this.keys.s.isDown
            ) -
            Number(
                this.cursors.up.isDown ||
                this.keys.w.isDown
            );

        const moving = dx !== 0 || dy !== 0;
        let actuallyMoved = false;

        // Final safeguard against leaving room boundaries.
        this.player.x = Phaser.Math.Clamp(
            this.player.x,
            ROOM_BOUNDS.left,
            ROOM_BOUNDS.right
        );
        const doorArea =
            this.player.x >= ROOM_BOUNDS.doorLeft &&
            this.player.x <= ROOM_BOUNDS.doorRight;

        // Final safeguard against leaving room boundaries.


        this.player.y = Phaser.Math.Clamp(
            this.player.y,
            getTopBoundary(this.player.x),
            getBottomBoundary(this.player.x)
        );

        if (moving) {

            // Normalize diagonal movement.
            const magnitude = Math.hypot(dx, dy);

            dx /= magnitude;
            dy /= magnitude;

            const distance =
                WALK_SPEED * Math.min(delta, 50) / 1000;

            const moveX = dx * distance;
            const moveY = dy * distance;

            // Test X movement separately.
            if (
                moveX !== 0 &&
                !this.blocked(
                    this.player.x + moveX,
                    this.player.y
                )
            ) {
                this.player.x += moveX;
                actuallyMoved = true;
            }

            // Test Y movement separately.
            if (
                moveY !== 0 &&
                !this.blocked(
                    this.player.x,
                    this.player.y + moveY
                )
            ) {
                this.player.y += moveY;
                actuallyMoved = true;
            }

            // Determine facing direction.
            this.lastDirection =
                Math.abs(dx) > Math.abs(dy)
                    ? dx > 0 ? 'right' : 'left'
                    : dy > 0 ? 'down' : 'up';
        }

        // Play walking animation only when moving.
        if (moving && actuallyMoved) {
            this.player.anims.play(
                `walk-${this.lastDirection}`,
                true
            );
        } else {
            this.player.anims.stop();

            const idleFrames = {
                down: 0,
                left: 4,
                right: 8,
                up: 12
            };

            this.player.setFrame(
                idleFrames[this.lastDirection]
            );
        }

        // Draw the player's actual collision footprint.
        if (this.debugFeet.visible) {

            const b = ROOM_BOUNDS;

            this.debugFeet.clear();

            // White rectangle = collision area around the feet.
            this.debugFeet.lineStyle(2, 0xffffff, 1);

            this.debugFeet.strokeRect(
                this.player.x - b.radiusX,
                this.player.y - b.radiusY,
                b.radiusX * 2,
                b.radiusY * 2
            );

            // White dot = exact player position.
            this.debugFeet.fillStyle(0xffffff, 1);

            this.debugFeet.fillCircle(
                this.player.x,
                this.player.y,
                3
            );
        }

        // Locate nearby interactable object.
        const candidates = INTERACTIONS
            .map(interaction => ({
                ...interaction,
                distance: Phaser.Math.Distance.Between(
                    this.player.x,
                    this.player.y,
                    interaction.x,
                    interaction.y
                )
            }))
            .filter(interaction =>
                interaction.distance <= interaction.radius
            )
            .sort((a, b) => a.distance - b.distance);

        this.nearby = candidates[0] ?? null;

        // Update the interaction prompt.
        if (this.nearby) {
            this.hint.setText(
                `E  ·  ${this.nearby.name}`
            );
        } else {
            this.hint.setText('');
        }
    }

    openInteraction(interaction) {

        // Send interaction to the government game.
        window.dispatchEvent(
            new CustomEvent(
                'government:office-action',
                {
                    detail: {
                        action: interaction.action,
                        name: interaction.name
                    }
                }
            )
        );
    }
}
