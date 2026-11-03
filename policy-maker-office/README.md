# Policy-Maker — Executive Office Prototype

An experimental **walkable Phaser 3.90.0 front end** for the existing Policy-Maker simulation. The uploaded `content.js` and `engine.js` are included **unchanged**; they still calculate crises, policies, elections, budget, debt, scheduled effects, and government outcomes. The new `js/office.js` only handles the room, movement, interactions, and decision dialogs.

## Run

1. Install Node.js 20+ if needed.
2. Open this folder in VS Code.
3. Run `npm start` (no npm install is necessary).
4. Open `http://localhost:4173` in a desktop browser with an internet connection (Phaser is loaded from jsDelivr).
5. Move with **WASD** or **arrow keys**, walk near a workstation and press **E**. You can also click furniture while close to it.

Alternative: `py -m http.server 8000` then visit `http://localhost:8000`.

## Office stations

| Station | Action | Available when |
| --- | --- | --- |
| Briefing desk (left) | Begin a term; read crisis; select response | No game, event phase, or after game ends |
| Policy cabinet (upper right) | Choose a policy, preview consequences and resolve turn | Policy phase |
| Reports board (lower right) | Read completed turn report or ending result | After a turn has resolved |
| Treasury ledger (lower left) | Inspect national meters, debt and future commitments | Any active term |
| Office door (top) | Advance to the next turn | After current turn is resolved |
| Executive desk (middle) | Context-aware shortcut for current phase | Any phase |
| Chief of staff (near bottom right) | See instructions and current objective | Any time |

## Integrating into your actual existing Policy-Maker project

Only the following *new* files are required inside your original project (which already has `js/content.js` and `js/engine.js`):

- Copy this `index.html`, rename it **`office.html`** in your original game's root.
- Copy `office.css` into the original project's root.
- Copy `js/office.js` into the original project's `js/` folder.
- Open `http://localhost:<yourport>/office.html`.

Do **not** replace the original `index.html`, `js/main.js`, `js/view.js`, `js/engine.js`, `js/content.js`, or existing save files. You can add a link to `office.html` in your existing menu if desired. The prototype is a standalone alternate interface, not a completed replacement for the original UI.

The uploaded files did *not* contain your original `js/storage.js`, `term.css`, or `dev-server.mjs`, so those are not included and the existing menu game was not repackaged. This demo is runnable without them. The prototype saves separately under `policy-maker-office-prototype-v1` and deliberately does not read or overwrite the original saves.

## Architecture

- **Phaser scene**: Draws a temporary office in pixel-like shapes, moves a president character, detects station proximity and makes furniture solid.
- **HTML dialogs**: Present the existing response, policy, preview, and report information for readability.
- **Original game engine**: Runs `createInitialState`, `selectResponse`, `beginPolicyPhase`, `selectPolicy`, `calculateTurn`, `resolveTurn`, `advanceTurn`, and `forecastBudget`.
- **State flow**: Office (start) → Briefing (event) → Policy Cabinet (policy) → Reports (report) → Door (advance) → repeat; on outcome visit Reports.

The artwork is an intentionally **procedural placeholder**, not a final illustrated office image or tileset. Replace `drawOffice()` later with a top-down office image or a Tiled map. Keep the hotspots, physics and engine integration.

## Validation

- `npm run check`: static syntax checks.
- `npm test`: verifies one event-to-policy-to-report transition in each mode.

This environment could not access a local browser server or the external Phaser CDN for end-to-end browser execution. The full playable visual is therefore not browser-tested here; inspect your browser console if a graphical issue occurs.

## Suggested next changes

1. Replace Phaser-drawn office with layered pixel-art background and furniture sprites.
2. Give the president a 4×4 directional sprite sheet, exactly as in your robot demo.
3. Add an aide who approaches the president when a crisis happens.
4. Replace large HTML decision dialogs with smaller conversations, papers and desk overlays.
5. Let office upgrades and character relationships reflect political choices while keeping the engine deterministic.
