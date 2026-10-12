# Policy-Maker — Your First Term

A government survival game built with plain HTML, CSS, and vanilla JavaScript. Play a twelve-turn first term with a four-card policy hand, or try the original three-turn introduction.

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
npm run balance
```

Tests cover the original prototype routes, hand/deck accounting, delayed effects, repayment, escalation, election boundaries, pure previews, and save restoration in every phase. The balance script compares four strategies across twenty shared seeds and writes `artifacts/balance-report.json`; scripted comparisons do not establish that every seed is winnable.

## Files

- `js/content.js`: meter definitions, fixed events, and policy cards.
- `js/engine.js`: pure calculations and state transitions.
- `js/main.js`: accessible UI rendering and interaction.
- `js/view.js`: cards, reports, budget ledger, and result presentations.
- `js/storage.js`: versioned local saves, validated by replaying recorded decisions.
- `styles.css`: responsive government briefing layout.
- `term.css`: mode selection, hand, history, and election layouts.
- `THREE_TURN_PROTOTYPE.md`: the implemented scenario specification.

In the full term, Treasury starts at 45, other meters at 60, and debt at zero. There are twelve distinct shuffled events and sixteen single-use policies. The opening hand includes separate fiscal and public-support options. Keep three cards when you play one, then draw a replacement. Previewing never draws cards or changes the run.

Any zero meter after settlement means collapse. After turn twelve, Approval below 50 loses the election; 50 or more wins re-election. The first term ends there. Results retain debt, obligations, detailed reports, and the next-budget forecast. Replay uses the same seed; another run gets a fresh seed.

Full-term choices and phase transitions autosave to this browser on the same Local URL. After reload, choose **Resume term** to restore the exact screen, hand, and selections. Restarting an active term asks before replacing its save. If browser storage is blocked or full, the game stays playable and displays a notice. Invalid or incompatible saves offer a fresh start.

The quick scenario keeps its original starting Treasury of 24, six policies, three fixed events, and two future service payments. It resets on reload and leaves a saved full term intact.

See `FIRST_TERM_PLAN.md` for the completed milestone and `BUILD_PLAN.md` for the broader outlook. Starting Treasury was tuned from 60 to 45 using the scripted comparisons; other initial numbers remain candidates for human playtesting.
