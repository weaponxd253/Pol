
import { OfficeScene } from './office-scene.js';

export function setupOffice({ app, render }) {

    const Phaser = window.Phaser;
    let officeGame = null;

    const officeScreen =
        document.getElementById('office-screen');

    const officeMessage =
        document.getElementById('office-message');

    const enterOfficeButton =
        document.getElementById('enter-office');

    const officeBackButton =
        document.getElementById('office-back');

    function enterOffice() {

        if (!Phaser) {
            console.error('Phaser failed to load.');
            return;
        }

        officeScreen.hidden = false;
        app.hidden = true;
        enterOfficeButton.hidden = true;

        officeMessage.textContent =
            'WASD or arrows to move. E to interact. C for collisions.';

        if (!officeGame) {

            officeGame = new Phaser.Game({
                type: Phaser.AUTO,
                parent: 'office-game',
                width: 960,
                height: 720,
                backgroundColor: '#17251f',
                pixelArt: true,
                roundPixels: true,
                scale: {
                    mode: Phaser.Scale.FIT,
                    autoCenter: Phaser.Scale.CENTER_BOTH
                },
                scene: [OfficeScene]
            });

        } else {
            officeGame.scene.resume('OfficeScene');
        }
    }

    function returnToBriefing() {

        if (officeGame &&
            officeGame.scene.isActive('OfficeScene')) {
            officeGame.scene.pause('OfficeScene');
        }

        officeScreen.hidden = true;
        app.hidden = false;
        enterOfficeButton.hidden = false;

        render({ focusHeading: true });
    }

    enterOfficeButton.addEventListener(
        'click',
        enterOffice
    );

    officeBackButton.addEventListener(
        'click',
        returnToBriefing
    );

    window.addEventListener(
        'government:office-action',
        (event) => {

            const action = event.detail.action;

            switch (action) {

                case 'national-policies':
                    returnToBriefing();
                    break;

                case 'exit-office':
                    returnToBriefing();
                    break;

                case 'cabinet-briefing':
                case 'archives':
                case 'advisors':
                    officeMessage.textContent =
                        event.detail.name +
                        ' is not connected yet.';
                    break;

                default:
                    console.warn(
                        'Unknown interaction:',
                        action
                    );
            }
        }
    );
}
