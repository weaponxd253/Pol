# Policy-Maker — Your First Term

A government survival game built with plain HTML, CSS, and vanilla JavaScript. Play a twelve-turn first term with a four-card policy hand, lasting nation conditions, and follow-up decisions, or try the original three-turn introduction.

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

Tests cover the original prototype routes, hand/deck accounting, delayed effects, repayment, escalation, election boundaries, condition timing and combined causes, colliding reviews, renewal payments, pure previews, and save restoration in every phase. The balance script compares four strategies across twenty shared seeds and writes `artifacts/balance-report.json`, including consequence activation counts. The earlier report is retained in `artifacts/balance-before-consequences.json`; scripted comparisons do not establish that every seed is winnable.

## Files

- `js/content.js`: meter definitions, base events, review events, nation conditions, and policy cards.
- `js/engine.js`: pure calculations and state transitions.
- `js/main.js`: accessible UI rendering and interaction.
- `js/view.js`: cards, reports, budget ledger, and result presentations.
- `js/storage.js`: versioned local saves, validated by replaying recorded decisions.
- `styles.css`: responsive government briefing layout.
- `term.css`: mode selection, hand, history, and election layouts.
- `THREE_TURN_PROTOTYPE.md`: the implemented scenario specification.

In the full term, Treasury starts at 45, other meters at 60, and debt at zero. There is a shuffled pool of twelve distinct base events, two policy-triggered reviews, and sixteen single-use policies. The opening hand includes separate fiscal and public-support options. Keep three cards when you play one, then draw a replacement. Previewing never draws cards or changes the run.

## Consequences

Known scheduled costs and benefits stay in the budget queue. Four policies also create temporary conditions, starting on the next turn:

| Policy | Condition | Duration | Future effect |
| --- | --- | --- | --- |
| Cut discretionary spending | Capacity strain | 3 turns | Worker settlements and emergency flood responses cost 2 more Treasury; freezing pay or relying on local flood capacity loses 2 more Stability. |
| Upgrade emergency services | Emergency preparedness | 4 turns | Emergency flood response costs 3 less Treasury; relying on local capacity loses 3 less Stability. |
| Procurement reform | Procurement oversight | 4 turns | A scandal inquiry costs 2 less Treasury and gains 2 extra Approval. |
| Trade agreement | Trade commitments | 4 turns | Negotiating a diplomatic dispute costs 2 less Treasury; confrontation loses 3 extra International Standing. |

A four-turn condition enacted on turn 3 applies on turns 4–7 and expires before turn 8. Conditions are conditional protection or risk, not guaranteed future meter changes. Opposing modifiers combine; their net adjustment is limited to ±4 per meter per response. Debt and low-Stability thresholds apply separately. Event effects are frozen on reveal: enacting preparation during a flood does not rewrite the already quoted flood response.

Temporary wage support reserves a review four turns after enactment, after its three original payments. Extend it for +4 Approval and two new payments of 3 Treasury on the next two turns, or end it for −3 Approval and −2 Stability. Infrastructure reserves a maintenance review three turns after enactment, after its original Economy benefit. Fund maintenance for −4 Treasury, +3 Economy, and +2 Stability, or lease operation for +3 Treasury, +4 Donors, and −4 Approval.

Each review occupies one of the existing twelve event slots and still includes a policy phase and budget. If the requested turn is reserved, the new review takes the next free turn; its actual date appears before commitment. Base events wait in their original order. Reviews do not generate more reviews. Original payments end on their original dates even if a review is delayed. Unanswered reviews beyond turn 12 remain in the ending report without an assumed response or payment.

The Nation conditions panel shows sources and active dates. Event explanations and detailed reports retain each cause separately. Results show the debt, future payments, remaining conditions, and unanswered reviews your government leaves behind. Same seed and choices reproduce the complete sequence; different policies can now lead to different reviews.

Any zero meter after settlement means collapse. After turn twelve, Approval below 50 loses the election; 50 or more wins re-election. The first term ends there. Results retain debt, obligations, detailed reports, and the next-budget forecast. Replay uses the same seed; another run gets a fresh seed.

Full-term choices and phase transitions autosave to this browser on the same Local URL, including conditions, reserved reviews, and frozen event costs. After reload, choose **Resume term** to restore the exact screen, hand, and selections. Restarting an active term asks before replacing its save. If browser storage is blocked or full, the game stays playable and displays a notice. Older rule-version saves cannot resume under the new rules; their stored data remains intact until an explicit replacement. Quick play and canceling replacement preserve that data. Changing between `localhost` and `127.0.0.1` also changes the browser's local save origin.

The quick scenario keeps its original starting Treasury of 24, six policies, three fixed events, and two future service payments. It resets on reload and leaves a saved full term intact.

See `FIRST_TERM_PLAN.md` for the completed first-term milestone, `CONSEQUENCES_PLAN.md` for the implemented consequence specification, and `BUILD_PLAN.md` for the broader outlook. Starting Treasury was tuned from 60 to 45 using the earlier scripted comparisons. The consequences use their planned initial values; human playtesting should guide further tuning.
