# Policy-Maker — Your First Term

A government survival game built with plain HTML, CSS, and vanilla JavaScript. Play a twelve-turn first term with a four-card policy hand, lasting nation conditions, and follow-up decisions, or try the original three-turn introduction.

## Play locally

With Node.js 20 or newer:

```sh
npm start
```

Open the Local URL printed in the terminal (normally http://127.0.0.1:4173). No dependency installation is needed. Use a local server rather than opening `index.html` directly because the game uses ES modules. Stop the server with Ctrl+C.

Start or resume a run, then choose **Enter Executive Office**. Use the navigation buttons to open the current briefing, policy desk, Cabinet report, or Archives. On the map, move with WASD or the arrow keys and press **E** at a station. The map loads Phaser from a CDN. If the CDN is unavailable, the office buttons still work.

Use the office door or the room button to enter the Government Corridor. The left door leads to the Cabinet Room, and the center doors lead back to the Executive Office. Leave the Cabinet Room through its south passage. The navigation buttons also connect these rooms. Press **C** on the map to toggle collision bounds, interaction zones, and the president’s foot position.

The corridor’s top-right door leads to the Press Briefing Room’s south aisle. Leave through that aisle to return to the same corridor door. The corridor’s south passage connects to the Situation Room’s north opening. Inside the Situation Room, press **E** at a marked station or choose **Situation Room Stations** for emergency briefings, the strategic map, diplomacy, intelligence, and national security. The stations use the current run’s data and open the existing response, policy, and report screens when those actions are available.

Use **Pause** or **Esc** to stop office movement. **Esc** closes an open office panel first. From the pause menu, continue, switch views, restart, or choose a mode. Restarting an active run asks for confirmation. A full term can be resumed from mode selection.

Press **E** near an official, or use the room’s **Speak with** button. **How are things going?** opens a personal update. The Finance Secretary has 12 entries covering normal finances, warnings, critical conditions, and current-turn objectives. Responses use Treasury, scenario-specific debt thresholds, interest, scheduled payments, and the selected policy’s full forecast; urgent problems take priority. Ask **What needs attention this turn?** for finance-specific guidance, or use the detailed budget, payments, debt, and recent decisions topics.

The Chief of Staff, Defense Secretary, Press Secretary, and Government Aide each have 12 entries covering normal conditions, warnings, crises, phase objectives, and distinct final outcomes. The Chief monitors the whole government; Defense tracks Stability and International Standing; Press tracks Approval and Donor Confidence; the Aide tracks Approval, Stability, Treasury, payment notices, and appointments. Updates recall the latest relevant enacted policy, separating its direct effects from the full turn’s changes. Selected choices are clearly identified as projections. Every official, including Finance, reacts to re-election, election defeat, survival of the opening scenario, or collapse in both the final report and results. Specialist topics and directions remain available; collapse preserves the failure figures and closes normal topics.

Dialogue reads the run without changing choices, drawing randomness, or advancing time. Staff definitions in `js/npc-content.js` specify each character’s room, sprite, position, and topics. `js/finance-dialogue.js` holds the Finance Secretary’s dialogue; `js/official-dialogue.js` holds the remaining officials’ dialogue and shared policy memory, phase, and outcome handling.

The Government Aide patrols a loop on the corridor’s open floor, pauses at waypoints, and waits for the president to pass rather than pushing them. Officials turn toward the president when a conversation opens, including conversations started with the room buttons. Walking stops while speaking or while the room is paused; closing the conversation resumes the patrol from its current position. NPC positions are temporary room behavior and do not change the saved government run.

NPC collisions follow compact foot shapes so the president can walk behind a character’s upper body. Patrols avoid furniture, other officials, station interaction areas, and reserved space around doors and room arrivals. Exits take priority over nearby conversations. If characters overlap after placement, the president can move outward to separate. Press **C** to see collision and talk-range outlines following the moving Aide.

## Verify

```sh
npm test
npm run check
npm run balance
```

Tests cover the original prototype routes, hand/deck accounting, delayed effects, repayment, escalation, election boundaries, condition timing and combined causes, colliding reviews, renewal payments, pure previews, and save restoration in every phase. The balance script compares four strategies across twenty shared seeds and writes `artifacts/balance-report.json`, including consequence activation counts. The earlier report is retained in `artifacts/balance-before-consequences.json`; scripted comparisons do not establish that every seed is winnable.

For a quick browser check, fund household relief and expand public services in the three-turn scenario. In the office, check the enactment notice and the Turn 2 payment warning. Advance from the Cabinet report and check that the payment is now marked due this turn. Try **Esc** from the map, cancel a restart, then return to the briefing and confirm you are still on Turn 2.

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
