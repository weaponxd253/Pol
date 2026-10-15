# Next step: lasting nation conditions

Status: implemented locally in version 0.3.0, together with the review-event slice in [CONSEQUENCES_PLAN.md](CONSEQUENCES_PLAN.md). Conditions include previews, source explanations, expiration, and save/replay validation.

## Deliverable

Add four policy-created conditions to the existing full first term. Each lasts a specified number of future turns and changes particular event responses. Players can inspect what created it, when it expires, and exactly how it changed a later outcome.

Ship the rules, player explanations, save support, and verification together. Follow-up review events are the next slice after this one has been played and balanced.

The current plain HTML/CSS/JavaScript architecture is sufficient. Preserve the 12-turn term, six meters, four-card hand, current budget formula, existing scheduled costs and benefits, and election rules. Retain the three-turn introduction's arithmetic and event order.

## Initial rules

Use the proposed values from the consequences outline for the first implementation:

| Condition ID | Source policy | Duration | Future response adjustments |
| --- | --- | --- | --- |
| `capacity-strain` | `cuts` | 3 future turns | `workers/settlement`: Treasury −2; `workers/freeze`: Stability −2; `flood/emergency`: Treasury −2; `flood/local`: Stability −2. |
| `emergency-preparedness` | `responders` | 4 future turns | `flood/emergency`: Treasury +3; `flood/local`: Stability +3. |
| `procurement-oversight` | `reform` | 4 future turns | `scandal/inquiry`: Treasury +2 and Approval +2. No change to `scandal/defend`. |
| `trade-commitments` | `trade` | 4 future turns | `dispute/negotiate`: Treasury +2; `dispute/firm`: International Standing −3. |

Positive Treasury adjustments reduce an existing response cost; they are not separate income payments. No condition applies an automatic per-turn meter effect.

Enactment on turn 3 with a four-turn duration means active turns 4–7 inclusive. The condition expires before turn 8's event. A condition created on turn 12 can remain relevant beyond the term and is disclosed in the result.

For each response, combine the active nation-condition modifiers and cap their net adjustment at ±4 per meter. Existing high-debt and low-Stability modifiers remain separate and are not subject to this new cap.

## 1. Define the content and validate it

In `js/content.js`, add declarative definitions with a stable ID, display name, source policy ID, duration, explanatory text, and event/response/meter targets. Associate definitions with full-term policies only; the shared quick-scenario policy definitions must not acquire the new behavior accidentally.

Validate unique condition IDs, positive integer durations, known full-term source policies, valid event and response targets, and finite effects on known meters. Reject conflicting definitions that create duplicate instances of the same condition. Existing single-use policies remain the creation limit.

Keep each card's immediate effects and any scheduled effects unchanged for the initial comparison. Change their future-consequence text to state the added condition and its duration. Continue to identify conditional protection as conditional, especially if the relevant event has already occurred.

## 2. Extend the pure engine

Store condition instances in `nationConditions`, with the condition ID, source policy ID/title, enactment turn, first active turn, and last active turn. Definitions remain in content; saved instances record provenance and timing.

Extend `calculateTurn` to return prospective new conditions and a committed condition snapshot along with the existing meter and budget report. Selecting or previewing a policy never changes the live condition list. Resolving commits its new condition once, using the same calculation that produced the preview.

On `advanceTurn`, remove conditions whose last active turn precedes the next turn, then reveal the next event. On its final active turn, retain the condition through the turn report and label it as expiring after that turn. Report creation and impending expiration without changing the length or phases of a turn.

When an event is revealed, resolve applicable conditions against each response and store the resulting snapshot. A new policy chosen during that turn cannot retroactively modify the already revealed event. Its normal immediate meter effects still apply during settlement.

Keep event order, policy draws, and random-state consumption exactly as they are for this slice.

## 3. Preserve the causes behind the totals

Give each frozen response an effect breakdown: base event amounts, existing debt/Stability adjustments, nation-condition adjustments with their source turns, and any correction introduced by the modifier cap.

`response.effects` remains the final sum used for effect chips and choice calculations. During settlement, add the breakdown to meter contributions rather than adding the final sum and its modifiers a second time.

This allows previews, reports, and save validation to agree while the player can still inspect each cause. Preserve the existing response IDs and the public functions used by the UI and scripted strategies where possible.

### Concrete arithmetic example

For a flood emergency response with Stability at least 30:

- Base Treasury cost: −8.
- Capacity strain from earlier spending cuts: −2.
- Earlier emergency preparedness: +3.
- Final response Treasury cost: **−7**.

If Stability is below 30, its existing −3 modifier makes the final cost **−10**. Both nation conditions and the Stability threshold must appear as distinct causes. The player's policy and normal budget then resolve as usual.

## 4. Show it at the point of decision

In `js/view.js` and `term.css`:

- On a relevant policy card, state the condition and duration before selection.
- In a selected policy preview, show the proposed condition with exact active turns and a clear preview label. It is not an active condition yet.
- Add a compact **Nation conditions** panel showing current and newly enacted conditions, their source turns, active ranges, and affected responses. Show a readable empty state.
- On an affected event response, explain the change: "Emergency preparedness enacted on turn 3 reduces Treasury cost by 3." Keep the final effect chips beside that explanation.
- On a turn report, show created and expiring conditions and retain detailed modifier causes in the meter ledger.
- On results, show conditions that have future active turns and their expiration. Conditions ending on the final resolved turn belong in the history, not in the future-obligations list.

Keep conditional event protection separate from guaranteed scheduled payments and benefits. The next-budget forecast must not assume that a particular future event will occur or that the player will select a response.

Use text as well as color, preserve existing keyboard focus behavior, and make the panel readable on narrow screens. No new confirmation or compulsory decision phase is required.

## 5. Save and replay the complete rules

Increment the rules and content versions for this release. Extend reconstruction in `js/storage.js` so replaying recorded decisions reproduces the condition instances, frozen response breakdowns, and reports, then passes the existing canonical comparison.

Exercise restoration in the event, policy, report, and result phases. Reloading on a condition's final active turn must retain that event's costs; advancing must expire the condition correctly.

Preserve incompatible older stored data until an explicit replacement term is started. `loadGame` should distinguish an incompatible saved run from having no save, and the launch flow in `js/main.js` should include existing incompatible data in its replacement decision. Display the reason a fresh term is needed. Quick play continues to leave that saved data intact.

## 6. Verify and balance

Add focused tests covering actual rules and interactions:

- The exact first and last active turns for both durations, including a condition created on turn 12.
- Correct adjustments to both response choices where specified, and no changes to unrelated events or quick mode.
- Procurement protection applies only to the inquiry; trade commitments help negotiation and worsen confrontation.
- Opposing modifiers, cap arithmetic, and existing Stability/debt adjustments retain correct totals and source records.
- Repeated previews leave state unchanged; commitment creates one instance; invalid repeated resolution remains rejected.
- A frozen event stays identical through policy selection and reload, including on an expiration boundary.
- The report equals the preview and every meter's contributions reconcile without double counting.
- Identical seeds and choices reproduce the complete condition history while keeping the original deck order.
- Save reconstruction rejects altered condition timing or effect breakdowns.
- Incompatible saves survive quick play and cancellation of a replacement term.

Run `npm test` and `npm run check`. Compare the four existing strategy styles over the same 20 seeds used by the current balance script. Preserve the pre-change balance report as a separate baseline before generating new results.

Review the scripted policy valuation so it accounts for conditional protection and risk using visible history, remaining duration, and the current event. Do not give it knowledge of the hidden shuffled event order. Record whether each condition actually applied, as survival percentages alone will miss a condition that is rarely useful.

Manually verify an early preparedness choice followed by a flood, a cuts/preparedness overlap, an expiration boundary, a relevant event that already happened, and an end-of-term condition. Check desktop/mobile layout and keyboard flow. Use reproducible runs or explicit engine fixtures for the arithmetic checks; do not rely on hoping a random run shows every case.

Balance review should inspect whether the extra protection makes already useful policies too strong, whether capacity strain creates recoverable pressure, and whether players understand that a protective condition may expire unused. Tune magnitudes only after the initial comparison, then rerun checks affected by the tuning.

## Done when

A player can see a condition before creating it, explain how it changed a later event, verify its expiration, and reload with identical quoted costs. The preview and report match, all current outcome types remain reachable, and the quick introduction still produces its original results.

After this slice passes those checks and receives a human playtest, implement the wage-support and infrastructure review events from the broader consequences plan. Their scheduling can then build on an established system for visible causes and saved decision history.
