# Policy-Maker: full first-term plan

Status: implemented locally, including both modes, the four-card hand, election outcomes, seeded replay, and autosave. Starting Treasury was tuned to 45 using scripted comparisons. The test suite preserves the original prototype and covers the full-term rules and saves.

## Goal

Build a 12-turn term that takes roughly 10–15 minutes. The player must keep all six meters above zero and finish with enough Approval to win re-election. Earlier decisions should affect later budgets and event severity.

Build on the existing event → policy → resolution → report loop, shared preview calculation, fiscal ledger, scheduled effects, keyboard controls, and responsive interface.

Keep the existing three-turn scenario available as a quick introduction. Plain HTML, CSS, and vanilla JavaScript remain sufficient.

## Modes and initial rules

| Setting | Quick scenario | Full first term |
| --- | --- | --- |
| Length | 3 turns | 12 turns |
| Initial Treasury | 24 | 45, tuned from the initial 60 |
| Other initial meters | 60 | 60 |
| Initial debt | 0 | 0 |
| Events | 3 fixed events | 12 events, shuffled without repeats |
| Policies | 6 visible, single-use | 16-card deck, four-card hand |
| Service commitment | 2 future payments | 3 future payments |
| Ending | Collapse or survival | Collapse, election loss, or re-election |
| Save | None | One local autosave |

Add a small mode selection at the start: **Play a full term** and **Try the three-turn scenario**. In the full term, show "Term 1 · Turn 5 / 12" and the election countdown. Keep the prototype's 90-day framing specific to its mode.

Store these differences in scenario configuration. Preserve the existing prototype arithmetic and tests rather than changing its constants globally.

## Policy hand and deck

- Start with four distinct policies.
- Guarantee one policy that restores funds and a separate policy that improves Approval or Stability in the opening hand. Fill the other two slots from the shuffled deck.
- Play exactly one policy each turn. It leaves the hand and cannot be played again that term.
- Draw one replacement after resolution if the run continues. Keep the other three cards.
- Do not consume cards or draw replacements during previews.
- After the final turn or a collapse, go to the report and result without drawing an unnecessary replacement.
- Show four cards during play, a remaining-deck count, and a compact record of enacted policies.

Sixteen cards support twelve selections and leave four unused overall. This creates different combinations across runs and gives the player a reason to preserve useful cards.

The opening guarantee provides useful tools at the start. Later difficult hands remain part of the strategy; they should be examined during balancing. Do not promise that every seed is winnable before testing it.

Policy eligibility must be checked against the current hand. Being present in the global content list is no longer enough to make a card playable.

## Content target

Keep the six existing policies and add ten. The proposed additions are:

| New policy | Role in the game |
| --- | --- |
| Emergency credit line | A second source of borrowing with a larger future obligation |
| Repay government debt | Spend available Treasury to lower debt and interest |
| Infrastructure investment | Pay now for an Economy improvement after a delay |
| Job training program | Support Approval and improve Economy later |
| Public consultation | Improve public support and Stability at a fiscal or donor cost |
| Procurement reform | Improve trust and Stability while upsetting parts of the funding coalition |
| Upgrade emergency services | Improve Stability at a Treasury cost |
| Diplomatic outreach | Restore International Standing at a domestic or fiscal cost |
| Trade agreement | Improve external relations and Economy with specific domestic concessions |
| Temporary wage support | Raise Approval while adding several future payments |

These are content roles, not final numerical effects. Set the numbers together so the deck offers recovery tools for all six meters and includes both immediate and delayed benefits.

Debt repayment pays only the amount actually repaid: for example, "Repay up to 10" costs 6 Treasury if only 6 debt remains. Show the actual amount in its preview and mark the card unavailable when there is no debt to repay.

The 12-event starting pool consists of the three existing events and nine additions:

| Family | Four events |
| --- | --- |
| Economic | Economic slowdown; cost-of-living squeeze; unexpected tax surplus; credit-market freeze |
| Domestic | Public workers demand relief; procurement scandal; donor coalition demands; flood emergency |
| International | International funding review; trade opportunity; diplomatic dispute; humanitarian assistance request |

Each event has two response choices. Include relief and mixed opportunities, especially the surplus, trade opportunity, and funding offer. An event deck composed entirely of penalties would make recovery depend too heavily on policy draws.

Use fictional context and explicit tradeoffs. Check whether different approaches can succeed rather than making one political philosophy the intended answer.

Twelve events are the initial implementation target. A larger pool can follow once a complete term feels good.

## Randomness and replay

Generate a seed for each new run. Use it to shuffle the event and policy decks once. Draw events without replacement.

For this milestone, choices affect consequences and severity while the seeded event order stays stable. This makes runs easier to compare and reproduce. Weighted event selection can come later.

- Show the seed on the result screen.
- Offer **Replay this run** with the same seed and **Start another run** with a new seed.
- Previews, card selection, and reloads must not advance randomness.
- Store generator state, deck order, hand, and current event in the save.
- Identical seed, choices, and content version must produce identical outcomes.

## Earlier decisions coming back

Keep the existing budget formula as the first balance baseline:

```text
Revenue = 8 + floor(Economy / 10)
Essential spending = 14
Interest = ceil(Debt × 0.05)
Budget change = revenue − spending − interest − scheduled payments
```

Restore the full-term service commitment to three future payments. Add a small number of policies with delayed benefits so early investment can help later turns.

Add two transparent event escalation rules initially:

1. **High debt:** above a proposed threshold of 30, financing-related events become more expensive. The second borrowing policy makes this threshold reachable.
2. **Low Stability:** below a proposed threshold of 30, disruption-related events have larger costs.

Thresholds and modifiers are provisional. Explain the active rule and its exact effect when revealing the event. Evaluate conditions once at the start of the turn and retain those revealed terms through selection and reload.

Let commitments and debt create pressure over time. Add further rules only when the playtests identify a useful missing interaction.

## Election and result

After the turn-12 settlement, apply these checks in order:

1. Any main meter at zero: **Government collapsed**.
2. All main meters above zero and Approval below 50: **Term completed — election lost**.
3. All main meters above zero and Approval at least 50: **Re-elected**.

Approval 50 passes. Collapse takes priority over election results. The initial Approval threshold should be tuned after full runs exist.

The first-term milestone ends at this checkpoint. Do not show a Continue button leading to an unimplemented second term.

Show final meters, debt, weakest final meter, average final meter, outstanding promises, next-budget forecast, and a readable history. A political win can still leave weak finances; make that visible. Do not erase obligations made near the election.

Defer a combined score until the term is balanced. Separate measures will reveal whether high Approval is being bought with unsustainable finances.

## Saving and interface

Autosave full-term progress after selections and phase transitions, including the report. Restore the same response, policy, current event, remaining decks, hand, future effects, and random state after reload.

Use a versioned local save with mode, rules version, and content version. Validate it before loading. Invalid or incompatible data should offer a fresh run with an explanation. If storage is unavailable, keep the game playable and explain that progress will not persist.

Provide an obvious **Resume term** option when a compatible save exists. Make replacing an active run intentional rather than silently overwriting it.

Adapt the current interface:

- Four policy cards with clear selection and exact effects.
- Approval's election target and turns remaining.
- The existing budget ledger and upcoming consequences.
- Compact grouping for recurring payments without hiding amounts or due turns.
- An accessible history view that can handle twelve reports without overwhelming the main decision area.
- Three distinct result presentations.

Preserve the current zero-meter warnings, shared preview calculation, keyboard focus flow, numerical labels, and narrow-screen layout.

## Changes to the code

- `content.js`: add the 12-event and 16-policy collections, mode configuration, and data validation for new operations and conditions.
- `engine.js`: add deck/hand state, seeded draws, current-event identity, hand validation, debt repayment, configurable durations, and election outcomes.
- `main.js`: add mode/resume controls, render the current hand, show election progress, and display the expanded results.
- `storage.js`: add save/load/version validation with safe storage-error handling.
- `styles.css`: adapt the hand, history, and election/result layouts.

Keep previewing pure. Deck draws and save writes belong to committed transitions. Keep selected event terms stable and scheduled Treasury payments counted once.

## Build order

1. **Configurable run length and election:** keep the quick scenario working and establish the 12-turn result rules with temporary content fixtures.
2. **Decks and hand:** deterministic shuffling, opening-hand coverage, single-use cards, replacement draws, and seed replay.
3. **Complete content and consequences:** reach 12 events and 16 policies, add repayment and delayed investments, and implement the two escalation rules.
4. **Persistence and interface:** autosave/restore, resume, election countdown, full history, and readable obligations.
5. **Balance and verify:** compare several strategies across repeatable seeds, tune numbers, and play complete desktop and mobile runs.

Temporary fixtures in step one are for development only. Finish the real content before treating the milestone as playable or complete.

## Completion gates

- The original three-turn routes still pass their arithmetic checks.
- A full term can reach collapse, election loss, and re-election without stuck phases.
- The hand/deck accounting is correct; a card cannot be played from outside the hand or consumed twice.
- Previewing, reloading, and report viewing do not draw new cards or events.
- Debt repayment handles partial debt, and delayed investments affect revenue on the advertised turn.
- Escalation thresholds are reachable, visible, and stable through a turn.
- Turn-12 promises remain in the final obligations and next-budget forecast.
- Reload restores every phase, including selected choices and the report.
- The Approval boundary is tested at 49 and 50, with collapse taking priority.
- Replay is deterministic for a fixed seed, choices, and content version.
- Complete runs work with keyboard input and a narrow screen.

Start balance comparisons with at least 20 fixed seeds and several scripted approaches: public-support spending, fiscal restraint, economic investment, and an adaptive balancing strategy. Scripted outcomes can expose dominant policies or severe draw problems; human playtests judge whether the choices feel meaningful. Do not infer that a seed is unwinnable just because one scripted strategy fails.

The milestone is ready when the player can complete a full term, understand the consequences, resume safely, and find a reason to try a different strategy. Further terms, leaderboards, and additional simulation systems can follow from that evidence.
