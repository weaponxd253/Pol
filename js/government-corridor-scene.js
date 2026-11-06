
const Phaser = window.Phaser;

const WIDTH = 960;
const HEIGHT = 720;
const WALK_SPEED = 165;


const CORRIDOR_DOORS = [
    {
        x: 155,
        name: 'Cabinet Room',
        action: 'cabinet'
    },
    {
        x: 480,
        name: 'Executive Office',
        action: 'office'
    },
    {
        x: 800,
        name: 'Situation Room',
        action: 'situation'
    }
];


export class GovernmentCorridorScene extends Phaser.Scene {

    constructor() {
        super('GovernmentCorridorScene');

        this.player = null;
        this.lastDirection = 'down';
        this.waitForERelease = true;
    }

    preload() {

        // New corridor background.
        this.load.image(
            'government-corridor',
            './assets/government_corridor.png'
        );
    }

    create() {

        // ======================================
        // CORRIDOR BACKGROUND
        // ======================================

        this.add.image(
            WIDTH / 2,
            HEIGHT / 2,
            'government-corridor'
        ).setDisplaySize(WIDTH, HEIGHT);

        // ======================================
        // WALKING ANIMATIONS
        // ======================================

        // Reuse the same sprite and animation format
        // already used by OfficeScene.

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


        // ======================================
        // PRESIDENT ENTERS FROM EXECUTIVE OFFICE
        // ======================================

        // The Executive Office is north of the corridor.
        // Spawn just below its upper-center doors.

        this.player = this.add.sprite(
            480,
            260,
            'leader',
            0
        )
            .setOrigin(0.5, 0.98)
            .setScale(0.25)
            .setDepth(10);


        // ======================================
        // MOVEMENT CONTROLS
        // ======================================

        this.cursors =
            this.input.keyboard.createCursorKeys();


        this.keys = this.input.keyboard.addKeys({
            w: Phaser.Input.Keyboard.KeyCodes.W,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            e: Phaser.Input.Keyboard.KeyCodes.E
        });


        this.input.keyboard.addCapture([
            Phaser.Input.Keyboard.KeyCodes.UP,
            Phaser.Input.Keyboard.KeyCodes.DOWN,
            Phaser.Input.Keyboard.KeyCodes.LEFT,
            Phaser.Input.Keyboard.KeyCodes.RIGHT
        ]);

        // ======================================
        // ROOM GUIDANCE
        // ======================================

        this.hint = this.add.text(
            WIDTH / 2,
            705,
            '',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                color: '#fff8e9',
                backgroundColor: '#162c24',
                align: 'center',
                padding: { x: 12, y: 7 }
            }
        )
            .setOrigin(0.5, 1)
            .setDepth(30);

        // Reset the entrance position whenever
        // the president returns to this corridor.
        this.events.on(Phaser.Scenes.Events.WAKE, () => {

            this.player.setPosition(480, 260);

            this.player.anims.stop();
            this.player.setFrame(0);

            this.lastDirection = 'down';
            this.waitForERelease = true;
        });

    }

    // ======================================
    // CORRIDOR COLLISION BOUNDARIES
    // ======================================

    canWalk(x, y) {

        // Outer boundaries and northern wall.
        if (
            x < 28 ||
            x > 932 ||
            y < 225 ||
            y > 710
        ) {
            return false;
        }

        // The lower-left and lower-right walls
        // block movement outside the south passage.
        if (
            y > 535 &&
            (x < 350 || x > 610)
        ) {
            return false;
        }

        return true;
    }

    update(_time, delta) {

        if (!this.player) {
            return;
        }

        let dx =
            Number(this.cursors.right.isDown || this.keys.d.isDown) -
            Number(this.cursors.left.isDown || this.keys.a.isDown);

        let dy =
            Number(this.cursors.down.isDown || this.keys.s.isDown) -
            Number(this.cursors.up.isDown || this.keys.w.isDown);

        const moving = dx !== 0 || dy !== 0;
        let actuallyMoved = false;

        if (moving) {

            // Normalize diagonal movement.
            const magnitude = Math.hypot(dx, dy);

            dx /= magnitude;
            dy /= magnitude;

            const distance =
                WALK_SPEED * Math.min(delta, 50) / 1000;

            const moveX = dx * distance;
            const moveY = dy * distance;

            // Check horizontal and vertical collisions
            // separately, allowing movement along walls.

            if (this.canWalk(
                this.player.x + moveX,
                this.player.y
            )) {
                this.player.x += moveX;
                actuallyMoved = true;
            }

            if (this.canWalk(
                this.player.x,
                this.player.y + moveY
            )) {
                this.player.y += moveY;
                actuallyMoved = true;
            }

            this.lastDirection =
                Math.abs(dx) > Math.abs(dy)
                    ? (dx > 0 ? 'right' : 'left')
                    : (dy > 0 ? 'down' : 'up');
        }

        // ======================================
        // ANIMATION
        // ======================================

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


        // ======================================
        // GOVERNMENT CORRIDOR DOORS
        // ======================================

        // Find which upper doorway the player is near.
        const nearbyDoor = CORRIDOR_DOORS.find(door =>
            Math.abs(this.player.x - door.x) < 75 &&
            this.player.y >= 225 &&
            this.player.y < 295
        );

        // Require the previous E press to be released.
        if (!this.keys.e.isDown) {
            this.waitForERelease = false;
        }

        // ======================================
        // EXECUTIVE OFFICE ENTRANCE
        // ======================================

        if (nearbyDoor?.action === 'office') {

            this.hint.setText(
                'E · Enter Executive Office'
            );

            if (
                !this.waitForERelease &&
                Phaser.Input.Keyboard.JustDown(this.keys.e)
            ) {

                // Wake the existing office scene.
                this.scene.switch('OfficeScene');
                return;
            }

            // ======================================
            // FUTURE GOVERNMENT ROOMS
            // ======================================

        } else if (nearbyDoor) {

            this.hint.setText(
                `${nearbyDoor.name} · Coming in Phase 6`
            );

            // ======================================
            // SOUTHERN HALLWAY
            // ======================================

        } else if (this.player.y > 620) {

            this.hint.setText(
                'Southern passage · Future expansion'
            );

        } else {

            this.hint.setText(
                'Explore the Government Corridor'
            );
        }

    }
}
