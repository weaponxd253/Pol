# Policy-Maker Game: build plan

Status: the three-turn introduction and full first term are implemented locally, including replay, election outcomes, and saves. Further terms and scoring remain expansion ideas. See README.md to run the game and its checks.

## First playable target

Build a fictional, single-player government survival game with plain HTML, CSS, and vanilla JavaScript. Start with one 12-turn term that takes roughly 10–15 minutes. The player responds to an event, chooses a policy, and sees the consequences each turn.

The first prototype must answer one question: **does staying popular now make it tempting to create problems for later?** Add more content and presentation only after this loop feels good.

Use a fictional nation and invented institutions. Policies describe actions and consequences, without party labels or a left/right alignment score. Playtesting should check that several approaches can survive, rather than one philosophy becoming the intended answer.

All numbers below are starting hypotheses for testing, not final balance values.

## What to build first

- Six main meters: Public Approval, Treasury, Donor Confidence, Economy, International Standing, and Stability.
- Visible debt as a number beneath Treasury. Debt starts at zero; zero debt is healthy, so it is not another meter that must stay above zero.
- A 12-turn term, followed by a re-election result.
- One event per turn, with two response choices.
- A hand of four policy cards; play one each turn and draw its replacement. Cards are single-use within the first term.
- Immediate effects, a few scheduled effects, and recurring fiscal costs.
- Warnings when a meter is low; defeat after resolution if any main meter reaches zero.
- A result screen explaining the collapse or election outcome and showing the run history.
- Restart and a local autosave.

First-term content target: 12 events and 16 policies. This is enough for a full run with a four-card hand. A three-turn sample with three events and six policies comes first, to validate the interface and engine.

Leave additional terms, a leaderboard, factions, a map, cabinet appointments, achievements, and online accounts for later. They do not help establish the core mechanic yet.

## The meters need different jobs

| Meter | Its main job | Failure at zero |
| --- | --- | --- |
| Public Approval | Determines re-election and public support for difficult decisions | Government loses its public mandate |
| Treasury | Pays immediate and continuing commitments | Government cannot meet its obligations |
| Donor Confidence | Creates pressure around regulation, taxation, and funding | Funding and governing support collapse |
| Economy | Influences tax revenue and exposure to economic shocks | Economic collapse |
| International Standing | Influences diplomatic support and external shocks | Diplomatic isolation |
| Stability | Measures unrest and institutional strain | Government loses control |

Start each main meter at 60, except Treasury: the full term uses 45 after balance comparisons, and the quick scenario uses 24. Values are bounded from 0 to 100. Warn below 20. Gains above 100 are wasted; the preview shows the actual gain after the cap.

Donor Confidence is the least natural instant-defeat condition. Keep it for the first test to preserve the proposed six-meter survival rule, but explain the governing coalition's dependence on funding. If this feels arbitrary in play, make zero trigger a funding crisis instead of direct defeat in a later revision.

Treasury units represent available fiscal capacity rather than real currency. Debt uses the same units. Display both together so borrowing is visibly a transfer from a future obligation into current funds.

## Make the popular path expensive

Give some policies costs that continue after the turn on which they are played. One-time Treasury penalties alone may allow the player to cancel every popular choice with a cheap corrective action.

Starting fiscal model:

```text
Tax revenue each turn = 8 + floor(Economy / 10)
Essential spending each turn = 14
Debt interest each turn = ceil(Debt × 0.05)
Treasury change = tax revenue − essential spending − interest − active commitments
```

At Economy 60 and no debt or commitments, the normal budget is balanced. Weak economic performance reduces income, while borrowing and promises increase costs. Show the projected budget change before the player resolves a turn.

Example policies to test:

| Policy | Benefit now | Cost or consequence |
| --- | --- | --- |
| Expand public services | Approval +9, Stability +4 | Treasury −6 now; costs 3 per turn for the next 3 turns |
| Cut spending | Treasury +10 | Approval −8, Stability −5 |
| Raise business taxes | Treasury +12 | Donor Confidence −9; Economy −3 next turn |
| Ease business regulations | Donor Confidence +8, Economy +5 | Approval −4, International Standing −3 |
| Issue emergency bonds | Treasury +18 | Debt +18; higher future interest |
| Negotiate an aid agreement | International Standing +7, Treasury +8 | Approval −4, Donor Confidence −4 |

These examples are hypotheses about an invented game's conditions, not claims about universal real-world policy effects. Give each card a specific context and check for dominant actions during balancing.

For the first version, the public-service commitment expires automatically after three turns. Permanent programs that can be repealed introduce another system; add that only if temporary commitments prove engaging.

## Exact turn sequence

1. **Event:** reveal one event and its two responses. The player selects a response.
2. **Policy:** show the selected event's projected effects and four policy cards. The player chooses one policy to repair damage or pursue a strategy.
3. **Resolution:** combine the immediate choices, apply consequences already due, settle the budget, and check the six meters.
4. **Report:** show the final values and a short explanation of what changed. Continue to the next turn or the result screen.

Do not end the run between the event and policy phases. The player must get the promised opportunity to patch event damage. Combine meter changes and clamp them once at resolution, so ordering does not accidentally erase a benefit or cost.

Calculate tax revenue from the Economy value after this turn's immediate and previously scheduled effects. A newly created continuing cost starts next turn. Newly issued debt incurs interest in the current settlement; show that in its preview. These timing rules should be identical in the preview and the actual resolution.

Keep the resolution report open until the player clicks Continue. Do not hide important consequences behind an animation or timed dismissal.

## Transparency and uncertainty

- Show exact immediate meter changes and known future obligations on cards.
- Show a projected Treasury settlement and flag any projected zero-meter result before commitment.
- Keep a small "Upcoming consequences" list: for example, "Public services: −3 Treasury for 2 more turns."
- Randomness chooses events and card order; it does not secretly change advertised outcomes.
- Explain context-dependent effects: "Higher interest because your debt is 54."
- Show each end-of-turn change as event + policy + scheduled effects + budget.

Start with three event families: economic shocks, domestic pressure, and international pressure. Include a few relief events. Avoid a deck made entirely of damage.

Add one escalation rule after the basic loop works: a credit-market event is more expensive above a visible debt threshold. Draw from the remaining event deck with adjusted weights, rather than repeatedly forcing the same crisis. Keep escalation rules and thresholds in content data so they can be tuned.

Use seeded randomness and save the generator's current state. That makes a bad run reproducible and stops a reload from producing a different event or hand.

## Election and scoring

The first prototype ends after turn 12:

- A meter at zero means collapse, with a cause-specific result.
- All meters above zero and Approval at least 50 means re-elected.
- All meters above zero but Approval below 50 means a completed term and an election loss.

This gives three distinct results: collapse, survival without re-election, and re-election. Record turns survived, lowest final meter, average final meter, and debt separately before inventing a single score. These numbers will make early balance problems easier to diagnose.

Once the core works, add a combined score that rewards completed terms and the weakest meter, with a debt penalty. A simple sum of meters would undermine the balancing theme by rewarding a few huge meters alongside one failing meter.

Then allow re-election to continue into a second term, retaining debt and commitments. Increase difficulty through a clear change, such as essential spending rising by 2, rather than arbitrary invisible damage. Add enough new cards before enabling longer campaigns.

## Screen layout

Use one main game screen:

```text
Nation name                       Term 1 · Turn 4 / 12

Approval  Treasury  Donors  Economy  International  Stability
          Debt: 36

[ Current event / selected response ]
[ Response A ]                       [ Response B ]

[ Policy 1 ] [ Policy 2 ] [ Policy 3 ] [ Policy 4 ]

Projected budget · Upcoming consequences · Resolve turn

[ Turn report and recent history ]
```

Reveal the event controls, policy controls, and report in their respective phases. Keep the meters visible throughout. On small screens, use a two-column meter grid and stack the cards. Use text and icons alongside color, real buttons, clear focus states, and keyboard-accessible card choices.

## Vanilla JavaScript structure

```text
index.html              Semantic screen structure
styles.css              Layout, meter states, responsive styling
js/main.js              Startup and user interactions
js/engine.js            State, choices, resolution, election rules
js/content.js           Event and policy definitions
js/view.js              Render state and effect previews
js/storage.js           Versioned local save and load
tests/engine.test.mjs    Focused engine checks once the rules exist
```

Use ES modules through a local static preview/server. No framework, build tool, or third-party runtime dependency is needed for this scope.

The game state is the source of truth; never read a meter's value back from the DOM. Keep the engine independent of the UI and storage, and make resolution return a new state. Let the preview use the same calculation as resolution without drawing cards, advancing randomness, or writing a save.

State should include:

- Save version, seed, and random-generator state.
- Turn, term, phase, and game outcome.
- The six meter values and debt.
- Event deck, current event, policy deck, and current hand.
- Selected response and selected policy.
- Scheduled effects and continuing commitments.
- Turn history with a structured effect breakdown.

Keep content in data objects with stable IDs. Effects should identify a meter and amount, or a typed operation such as borrowing or a scheduled cost. Keep card text out of the engine. Validate content for duplicate IDs, unknown meter names, and invalid durations.

Autosave after each committed choice and phase transition, including the turn report. Reloading must restore the current phase. A save version allows future rule changes to reject an incompatible save cleanly.

## Build sequence and completion gates

### 1. Three-turn vertical slice

Build the meters, one event choice, one policy choice, a resolution report, and restart. Use three events and six policy cards, no shuffle and no persistence.

The detailed scenario is specified in [THREE_TURN_PROTOTYPE.md](THREE_TURN_PROTOTYPE.md). It starts Treasury at 24, shows all six single-use policies, and uses two future service payments to demonstrate the cost within three turns. These are prototype-specific overrides to the full-term defaults above.

Done when a player can complete three turns and understand why every meter changed. Include one service-spending card and one borrowing card to demonstrate future costs immediately.

### 2. Complete one term

Add the 12-turn limit, four-card hand, deterministic shuffling, collapse outcomes, and election result. Expand to 12 events and 16 policies.

The next milestone is detailed in [FIRST_TERM_PLAN.md](FIRST_TERM_PLAN.md), including preservation of the quick scenario, opening-hand coverage, save/restore, and balance checks.

Done when a fresh run can reach each of the three outcomes without console errors or stuck phases.

### 3. Fiscal consequences and fairness

Refine the budget formula, commitment queue, exact previews, warnings, and one debt-sensitive event. Provide a seed in the result screen so runs can be repeated.

Done when previews match actual outcomes, commitments expire on the advertised turn, and repeated borrowing or spending clearly weakens later budgets.

### 4. Save and presentation

Add autosave, restore, mobile layout, keyboard interaction, concise instructions, and readable result history.

Done when a reload works in every phase and the full loop is usable on a narrow screen without relying on color.

### 5. Balance and expand

Play multiple fixed seeds using different approaches. Tune card values and event frequency before adding a second term or more systems.

Done when there are several viable strategies, risky choices sometimes pay off, and outcomes are understandable. Use scripted strategies to detect obvious exploits; human playtesting still decides whether the choices feel interesting.

## Verification that matters

Once the engine is implemented, use focused tests for:

- Event and policy effects resolving together, including a policy rescuing an event-damaged meter.
- Known scheduled costs starting and expiring on the correct turns.
- Borrowing, interest, and economy-driven revenue matching the preview.
- Zero-meter defeat and the turn-12 Approval threshold.
- Identical seeds and choices producing identical outcomes.
- Saving and restoring the current phase, deck, hand, commitments, and random state.
- Invalid or repeated actions being rejected instead of resolving a turn twice.

Manually verify the responsive layout, keyboard flow, low-meter warnings, report readability, and reload behavior. Do not add broad UI automation before there is a stable playable interface.

## Most important design risks

1. **Every meter feels interchangeable.** Give Economy a fiscal role, Approval an election role, and debt/commitments a delayed role before adding more systems.
2. **One repeated strategy solves every run.** Use single-use policy cards and varying events; test whether card combinations still create an easy exploit.
3. **Bad luck decides everything.** Keep outcomes explicit, mix relief into the event deck, and test difficult seeds for meaningful recovery choices.
4. **Future costs feel like a trick.** Advertise timing and show obligations persistently.
5. **The game accidentally declares a political ideology correct.** Make consequences depend on fictional conditions, include benefits and risks across approaches, and evaluate several successful strategies.

The three-turn prototype, full first term, and [consequences system](CONSEQUENCES_PLAN.md) are implemented locally. Four lasting nation conditions and two scheduled review events now have visible causes, timing, and save/replay support. Playtest their balance and clarity before adding further terms or a combined score.

The implemented first consequence slice is documented in [NATION_CONDITIONS_PLAN.md](NATION_CONDITIONS_PLAN.md), covering condition rules, previews and reports, save/replay support, and focused verification.
