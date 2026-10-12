# Policy-Maker — The First 90 Days

A three-turn government survival game built with plain HTML, CSS, and vanilla JavaScript. Respond to fixed events, choose single-use policies, and balance public support against spending and debt.

## Play locally

With Node.js 20 or newer:

```sh
npm start
```

Open the Local URL printed in the terminal (normally http://127.0.0.1:4173). No dependency installation is needed. Use a local server rather than opening `index.html` directly because the game uses ES modules. Stop the server with Ctrl+C.

## Verify

```sh
npm test
npm run check
```

Tests cover the three planned routes, recurring costs, interest, previews, invalid actions, final-turn obligations, debt-sensitive event terms, and repeatability.

## Files

- `js/content.js`: meter definitions, fixed events, and policy cards.
- `js/engine.js`: pure calculations and state transitions.
- `js/main.js`: accessible UI rendering and interaction.
- `styles.css`: responsive government briefing layout.
- `THREE_TURN_PROTOTYPE.md`: the implemented scenario specification.

Treasury starts at 24, other meters at 60, and debt at zero. One event response and one unused policy are required each turn. Defeat is checked after both decisions and the budget settle. The final screen includes commitments that extend beyond turn three.

This slice intentionally resets on reload. It has no election, random deck, or combined score; those belong to the full-term plan in `BUILD_PLAN.md`.
