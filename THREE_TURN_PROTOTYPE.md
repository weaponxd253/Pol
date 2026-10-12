# Policy-Maker: three-turn prototype

Status: implemented locally in plain HTML, CSS, and vanilla JavaScript. The example routes below are covered by the engine test suite. Run `npm start` to play and `npm test` to verify the rules.

## Purpose

Build a short, repeatable scenario called **The First 90 Days**. It should take roughly 3–5 minutes and demonstrate three things:

1. A popular response can exhaust available funds.
2. Borrowing solves an immediate problem while worsening future budgets.
3. Protecting finances can leave the government unpopular.

The player should be able to explain a result using their choices and the turn reports. This is the first test of the loop and its readability; longer-term difficulty comes later.

## Scope and starting conditions

- Exactly three turns, in a fixed event order.
- Six main meters from 0 to 100.
- Approval, Donor Confidence, Economy, International Standing, and Stability start at 60.
- Treasury starts at **24**. Debt starts at **0**.
- All six policies are visible. Each can be used once per run; used cards remain visible and disabled.
- One event response and one policy are required per turn.
- No shuffle, random effects, card drawing, saves, elections, or combined score in this slice.
- Restart restores the same initial scenario.

These are deliberate prototype overrides to the larger build plan: lower initial Treasury creates pressure in three turns, and service commitments last for two future turns so both payments can appear in this sample. The four-card hand belongs to the full-term milestone.

## Turn rules

1. Read the event and select one of two responses.
2. Click **Choose policy** to lock that response and enter the policy phase. Selecting a response does not change the real meters.
3. Select one unused policy. Show the final projected meters and budget. The player may change this selection before resolving.
4. Click **Resolve turn**. Apply all consequences once and show the report.
5. Click **Next turn**, or **View result** after turn three or a collapse.

No automatic timers. No defeat check between the event and policy phases. A temporary shortage caused by the event can be rescued by the policy.

At resolution:

1. Combine immediate event effects, immediate policy effects, and effects scheduled for this turn.
2. Calculate the five non-Treasury meters, bounded to 0–100.
3. Add newly issued debt, then calculate revenue, interest, and continuing costs.
4. Combine all Treasury changes, settle the budget, and bound Treasury to 0–100.
5. Check all six main meters for zero. Record all failing meters if more than one reaches zero.
6. Register newly created future effects, mark the policy used, and record the report.

Do not clamp Treasury between individual effects. Retain the raw settlement in the report so a negative balance can be explained as a shortfall, even though the displayed meter stops at zero.

New debt incurs interest in the turn it is issued. New continuing costs start next turn. The last scheduled payment is charged before the commitment expires.

## Budget formula

```text
Revenue = 8 + floor(resolved Economy / 10)
Essential spending = 14
Interest = ceil(total Debt × 0.05)
Commitment costs = payments due this turn
Budget change = Revenue − Essential spending − Interest − Commitment costs
Final Treasury = starting Treasury + event changes + policy changes + Budget change
```

Economy includes any scheduled change due this turn before calculating revenue. Treasury is a fiscal-capacity number, not a percentage of debt or a real currency amount.

Example: at Economy 56, Debt 18, and a service payment of 3, revenue is 13 and the budget change is `13 − 14 − 1 − 3 = −5`.

## Fixed events

Effects listed here are the complete immediate effects of each response. Do not add a separate, hidden event penalty.

| Turn and event | Response | Immediate effects |
| --- | --- | --- |
| 1: **Economic slowdown** — Employers cut hours and households ask for support. | Fund household relief | Approval +6; Treasury −10; Economy −4 |
| 1: Economic slowdown | Absorb the downturn | Approval −6; Economy −12; Stability −4 |
| 2: **Public workers demand relief** — Workers threaten disruption after a pay freeze. | Fund a temporary settlement | Treasury −8; Approval +5; Stability +6 |
| 2: Public workers demand relief | Maintain the freeze | Approval −7; Stability −8; Donor Confidence +4 |
| 3: **International funding review** — An external fund offers support in exchange for oversight. | Accept the oversight agreement | Treasury +8; International Standing +4; Approval −6 |
| 3: International funding review | Decline the agreement | International Standing −6; Donor Confidence −4; Treasury −4 if debt is at least 18 |

For turn three, determine the extra cost from debt at the **start of that turn**, when the event is revealed. Explain it directly on the response: "With debt of 18 or more, declining also costs 4 Treasury in refinancing fees." A policy chosen afterward does not change the revealed event terms.

These events are situations in the fictional scenario, not general predictions about real-world policies.

## Six policy cards

| Policy | Immediate effects | Future consequence |
| --- | --- | --- |
| **Expand public services** | Approval +9; Stability +4; Treasury −6 | Treasury −3 at each of the next two resolutions |
| **Cut discretionary spending** | Treasury +10; Approval −8; Stability −5 | None |
| **Raise business taxes** | Treasury +12; Donor Confidence −9 | Economy −3 next turn |
| **Ease business regulations** | Donor Confidence +8; Economy +5; Approval −4; International Standing −3 | None |
| **Issue emergency bonds** | Treasury +18; Debt +18 | Interest rises immediately and remains in later budgets |
| **Negotiate an aid package** | International Standing +7; Treasury +8; Approval −4; Donor Confidence −4 | None |

All future effects appear on the card before selection. A policy played on turn three can still create obligations beyond the sample; those obligations must appear on the final result instead of disappearing.

For services, store two scheduled Treasury payments with their due turns. For business taxes, store one scheduled Economy change. A small dated effect list can handle both; a general scripting language for effects is unnecessary.

## One-screen interface

Start directly on turn one with a short instruction: "Respond to an event, choose a policy, and keep every meter above zero. Promises and debt affect later budgets."

```text
THE FIRST 90 DAYS                                  Turn 1 / 3

Approval     Treasury     Donors     Economy     International     Stability
60 / 100     24 / 100      60 / 100   60 / 100     60 / 100          60 / 100
             Debt: 0

ECONOMIC SLOWDOWN
Employers cut hours and households ask for support.

[ Fund household relief ]             [ Absorb the downturn ]
                                      [ Choose policy ]

POLICY PHASE
Selected response: Fund household relief
[ Services ]       [ Spending cuts ]       [ Business taxes ]
[ Regulations ]    [ Emergency bonds ]     [ Aid package ]

PROJECTED RESULT
Revenue 13 · Spending 14 · Interest 0 · Commitments 0
Budget change −1 · Treasury after resolution 7
New obligation: services cost 3 on turns 2 and 3
                                      [ Resolve turn ]

REPORT
What changed, why it changed, and what is still due
                                      [ Next turn ]
```

Only the active phase's controls appear. Keep the actual meter values visible and show projected values separately, with explicit labels. An unused policy becomes committed only when the turn resolves.

Use low-meter warnings below 20. If the selected combination will cause collapse, show which meter fails and its shortfall before resolution. Warn without blocking the choice or adding a confirmation modal.

Keep a visible **Upcoming costs** list throughout policy selection and reports. Show cost, due turn, and source.

On a narrow screen, use a two-column meter grid and a single column of cards. Use real buttons, numerical meter labels, readable focus states, and text for warnings alongside color. Move focus to the new phase's heading when advancing so keyboard users can follow the flow.

## Turn report

Include:

- The event response and policy played.
- Every changed meter's starting and final value.
- An effect breakdown by event, policy, and previously scheduled consequences.
- Revenue, essential spending, interest, and scheduled Treasury payments.
- New debt and future commitments.
- A clear explanation if a meter has reached zero.

Example after funding relief and expanding services on turn one:

```text
Approval: 60 → 75     Relief +6; services +9
Treasury: 24 → 7      Relief −10; services −6; budget −1
Economy: 60 → 56      Slowdown response −4
Stability: 60 → 64    Services +4

Budget: revenue 13 − essential spending 14 = −1
Upcoming: services −3 Treasury on turn 2 and turn 3
```

Do not require the player to remember earlier card text to understand a later bill.

## Results

There are two outcomes in this slice:

- **Government collapsed:** a meter reached zero. Name the meter and explain the cause using the final report.
- **Opening crisis survived:** three turns completed with all meters above zero. This does not award re-election or imply the government is financially healthy.

Both show final meters, debt, choices taken, and outstanding obligations. Include a next-turn budget forecast using known scheduled effects, current debt, and unchanged policy/event assumptions; label it **"Next budget, before new decisions or events."** This prevents final-turn borrowing or promises from looking cost-free.

Do not add a combined score. The player should compare Approval, funds, debt, and obligations directly. Finish with a **Restart scenario** button.

## Checked example routes

These are arithmetic checks for the proposed constants, not proof of final game balance.

### Popular spending followed by borrowing

1. Fund household relief + Expand public services.
2. Fund the worker settlement + Issue emergency bonds.
3. Accept oversight + Cut discretionary spending.

| After turn | Treasury | Approval | Debt | Budget change that turn |
| --- | --- | --- | --- | --- |
| 1 | 7 | 75 | 0 | −1 |
| 2 | 12 | 80 | 18 | −5 |
| 3 | 25 | 66 | 18 | −5 |

The player survives, but debt remains. The service payments are finished; the next budget is still −2 before new choices.

### Protecting funds at a political cost

1. Absorb the downturn + Raise business taxes.
2. Maintain the freeze + Ease business regulations.
3. Accept oversight + Negotiate an aid package.

| After turn | Treasury | Approval | Debt | Budget change that turn |
| --- | --- | --- | --- | --- |
| 1 | 34 | 54 | 0 | −2 |
| 2 | 33 | 43 | 0 | −1 |
| 3 | 48 | 33 | 0 | −1 |

The player finishes with more money and no debt, but Approval is 33. The larger game's proposed election threshold of 50 would make that dangerous.

### A clear Treasury collapse

1. Fund household relief + Expand public services: Treasury ends at 7.
2. Fund the worker settlement + Ease business regulations: raw Treasury is `7 − 8 − 3 = −4`.

The government collapses on turn two with a shortfall of 4, even though Approval is 76. Choosing emergency bonds instead would rescue this turn. The warning must explain this before the player resolves it.

## Minimal implementation structure

```text
index.html       Semantic page regions and controls
styles.css       Layout, cards, meters, warnings, narrow-screen styling
js/content.js    Three events and six policy definitions
js/engine.js     State, resolution calculation, phase rules, future effects
js/main.js       Button handlers, rendering, focus changes, restart
```

Use plain ES modules with a local static preview/server. No framework or build tooling is required. Save/storage and a separate view module can wait for the full-term milestone.

Suggested state:

```text
turn: 1
phase: event | policy | report | result
meters: { approval, treasury, donors, economy, international, stability }
debt: 0
selectedResponseId: null
selectedPolicyId: null
usedPolicyIds: []
scheduledEffects: []  // source ID, due turn, meter, amount
history: []
outcome: null | survived | collapsed
```

The event comes from `events[turn - 1]`; a random deck is unnecessary.

Keep these responsibilities separate:

- `createInitialState()` returns a fresh scenario, including empty arrays.
- `calculateTurn(state, responseId, policyId)` returns projected meters, debt, new obligations, collapse causes, and a report without changing state.
- `resolveTurn(...)` uses that calculation and commits the result once.
- `advanceTurn(...)` routes from the report to the next event or result.
- `render(state)` displays the current phase and available choices.

The preview and resolution use the same calculation. Validate phase, current-event response, and unused policy before committing. A double-click must not apply effects twice or consume two policies.

## Implementation order

1. **Engine and content:** encode the fixed scenario and calculate the three example routes above.
2. **Playable loop:** render the meters, response choices, policies, report, result, and restart.
3. **Transparency:** add exact projections, budget breakdowns, upcoming effects, and collapse warnings.
4. **Usability:** handle disabled/selected cards, keyboard focus, and the narrow-screen layout.
5. **Verification and a short playtest:** check the rules, then watch whether a player understands the bills and can explain their result.

Do not build a save system or shuffle before the entire three-turn loop works.

## Completion criteria

- All three checked routes produce the listed results.
- The turn-one services card charges exactly once on turns two and three.
- Business taxes reduce Economy next turn and affect that turn's revenue.
- Borrowing increases both Treasury and debt and charges interest immediately.
- A policy can rescue an event-driven shortage before defeat is checked.
- Previewing a choice changes no state; preview and actual result match.
- Resolving twice or choosing a used card does not change state again.
- A final-turn commitment remains visible in the result and next-budget forecast.
- No meter below 20 lacks a textual warning, and every collapse names its cause.
- A player can finish and restart using a keyboard or narrow screen.
- Restart reproduces the same initial state and fixed event order.

Use a few focused engine checks for the arithmetic, effect timing, phase restrictions, and state purity. Manually verify the screen flow and readability; extensive UI automation is unnecessary for this slice.

During the first playtest, observe whether the player notices recurring costs before spending, understands how debt changes the budget, and sees a reason to try another route. Adjust numbers after those questions are answered.
