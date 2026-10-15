# Policy-Maker: consequences plan

Status: implemented locally in version 0.3.0, with all four conditions, both review events, causal reports, legacy summaries, and versioned save/replay support. The initial values below were retained after scripted comparisons; human balance playtesting remains useful.

The first build slice is specified in [NATION_CONDITIONS_PLAN.md](NATION_CONDITIONS_PLAN.md). Both slices are now present, including the two review events and payments created by review responses. The remaining document records the rules and acceptance criteria used for implementation.

## Goal

Make the player feel that earlier choices change the government they are running. A policy should sometimes create protection, a vulnerability, or a later decision, as well as moving today's meters.

The player should be able to explain the connection: "This flood response is cheaper because I prepared earlier," or "That cut bought time, but now staffing makes this dispute harder."

Build this into the existing 12-turn first term, using plain HTML, CSS, and vanilla JavaScript. Keep the six meters, four-card hand, event → policy → resolution loop, budget formula, zero-meter defeat, and Approval-based election. Keep the three-turn scenario's current rules.

## What already exists

The engine already implements scheduled service and wage payments, delayed investment and training benefits, tax effects on the next turn, persistent debt and interest, and events that worsen under high debt or low Stability. Exact previews, upcoming obligations, reports, seeded replay, and autosave already expose these effects.

Extend those systems. Do not add a second charge for an obligation that is already in the budget, or another passive penalty that duplicates a meter threshold.

## The system's three consequence types

| Type | What it does | Timing | Player promise |
| --- | --- | --- | --- |
| Scheduled effect | Applies a known meter payment or benefit once on its due turn. | Exact due turn. | "Treasury −3 on turns 4, 5, and 6." |
| Nation condition | Changes specific future event responses while active. | First and last active turns. | "Preparation reduces a flood response cost by 3 if the flood occurs while protection is active." |
| Scheduled review | Creates a future event with a new decision. | Reserved event turn. | "On turn 7, choose whether to extend wage support." |

Debt remains its existing persistent balance with interest in the budget. It is not another scheduled effect, and its existing event thresholds remain separate rules.

Keep these types distinct in data and presentation, but give all of them source IDs, readable source names, and enactment turns. The common requirement is visible causality, not a new meter.

## Scope and build order

1. Build preparedness and its flood modification end to end: content, timing, pure preview, source breakdown, interface, expiration, and save/replay.
2. Add the remaining three nation conditions using the same mechanism. Verify their interactions and compare balance against the existing first-term game.
3. Add the two scheduled reviews and support future effects created by their responses. Include slot reservation, interface, source-linked reports, and save/replay in this slice.
4. Complete the end-of-term legacy view, play through several seeds, and compare strategies before tuning the final values.

Treat the numbers below as initial balance values. The causal relationships and timing rules are the implementation contract; tuning may change magnitudes.

## First slice: four nation conditions

Each condition comes from an existing policy. It changes named future responses rather than automatically draining a meter every turn.

| Condition | Created by | Active on future turns | Proposed event changes |
| --- | --- | --- | --- |
| Capacity strain | Spending cuts | Next 3 turns | Workers: settlement costs 2 extra Treasury; wage freeze loses 2 extra Stability. Flood: emergency response costs 2 extra Treasury; relying on local capacity loses 2 extra Stability. |
| Emergency preparedness | Upgrade emergency services | Next 4 turns | Flood: emergency response costs 3 less Treasury; relying on local capacity loses 3 less Stability. |
| Procurement oversight | Procurement reform | Next 4 turns | Scandal: an independent inquiry costs 2 less Treasury and gains 2 extra Approval. Defending the administration receives no bonus. |
| Trade commitments | Trade agreement | Next 4 turns | Diplomatic dispute: negotiation costs 2 less Treasury; taking a firm stand loses 3 extra International Standing because partners have more at stake. |

These links give spending cuts an immediate fiscal benefit and a temporary operational risk; preparation and reform offer protection that matters when relevant events arrive; trade creates both an opportunity and a constraint.

### Timing and interaction

- Enacting a condition on turn 3 for four turns makes it active on turns 4–7 inclusive. It expires before the event on turn 8.
- Conditions begin after the enactment turn. A policy does not rewrite the event response the player already selected that turn. Its existing immediate effects still help during settlement.
- Determine applicable conditions when the next event is revealed, and freeze their effects with that event. Reloads and later policy selections cannot change its quoted costs.
- Existing debt and Stability rules keep their separate causes. Add the new condition modifiers separately, combine opposing modifiers, and cap the net new condition adjustment at ±4 for each meter on each response. The cap does not change existing threshold rules.
- If capacity strain and preparedness both affect a flood, combine them. For emergency response, the proposed modifiers total +1 Treasury: preparation saves 3, while strain costs 2. Show both sources.
- A condition ID has one active instance. In this milestone, single-use policies prevent duplicate creation. Keep an explicit no-stacking rule for later expansions.
- Every condition names its source policy, enactment turn, first and last active turns, and affected responses. Conditional protection is labeled as conditional; it is not shown as a guaranteed future payment or benefit.
- Duration counts calendar turns, including review-event turns. A review does not pause a condition or extend its protection window.

## Second slice: two follow-up decisions

Follow-ups are scheduled, deterministic events caused by particular enacted policies. They provide choices; they do not silently apply extra penalties.

| Source | Review timing | Event | Response A | Response B |
| --- | --- | --- | --- | --- |
| Temporary wage support | Four turns after enactment, after its three existing payments | Wage support expires | Extend support: Approval +4 now, Treasury −3 on each of the next 2 turns. | End the program: Approval −3 and Stability −2 now; no new commitment. |
| Infrastructure investment | Three turns after enactment, after its existing Economy benefit | Infrastructure maintenance review | Fund public maintenance: Treasury −4, Economy +3, Stability +2. | Lease operations to a consortium: Treasury +3, Donors +4, Approval −4. |

The wage review does not charge the original support payments again. The infrastructure review does not repeat the original Economy +8 delivery benefit. Each original policy creates its review once. Review responses do not generate another review in this milestone.

Event responses currently have no engine path that schedules new payments. Extend the existing scheduled-effect calculation to accept both the selected policy's future effects and the selected event response's future effects. Both use the same due-turn queue and Treasury ledger. A renewal's first new payment is on the turn after the review, followed by its second payment one turn later.

If a wage review is delayed by another review, the original payments still stop on their original dates. Show the end of funding and the later review separately. The gap does not invent additional payments or an automatic political penalty. The selected review response determines its listed immediate changes.

### Event scheduling

- Keep exactly one event and one policy choice per turn, and exactly 12 turns.
- Keep the seed's shuffled base-event order. A review uses its reserved event slot; the next base event stays at the front of the deck for a later turn. Consequently, a term with reviews will see fewer of the original 12 base events.
- Reserve the review slot when its source policy resolves. Use its target turn, or the next unreserved turn if another review already occupies that slot. Existing reservations never move.
- Display the final reserved turn immediately in the preview and upcoming list. A collision must not create two events in one turn or an undisclosed delay.
- With two single-use source policies, there are at most two reviews per term. There are no recursive event chains.
- A reservation beyond turn 12 remains in the final outstanding-consequences list. It does not extend the term or apply a response the player has not chosen.
- The seed and the same choices reproduce the same event sequence and consequences. Different choices can now produce different reviews, while the underlying shuffled deck stays reproducible.

For example, wage support enacted on turn 2 requests a review on turn 6. Infrastructure enacted on turn 3 also requests turn 6. The first reservation stays on turn 6; the second is reserved on turn 7, which appears in its policy preview before commitment. The base event that would otherwise have appeared on turn 6 is drawn after those reviews, on turn 8. Both turns still include the normal policy phase and budget settlement.

## State and content contract

Use declarative content and explicit state records rather than special cases scattered through the interface.

| Record | Required information | Responsibility |
| --- | --- | --- |
| Scheduled meter effect | Stable instance ID, source type/ID/title/turn, due turn, meter, amount. | Existing `scheduledEffects` queue; consume each due instance once. |
| Nation condition | Stable instance ID, condition definition ID, source policy ID/title/turn, first active turn, last active turn. | `nationConditions`; activate and expire by turn, without passive meter changes. |
| Review reservation | Stable instance ID, review definition ID, source policy ID/title/turn, requested turn, reserved turn. | `reviewReservations`; consume its slot once when the review is revealed. |
| Revealed event | Event definition ID, base/review origin, review source when relevant, frozen response effects and their cause breakdowns. | `currentEvent`; remain stable through choices and reload. |
| Turn report | Event and choice IDs, meter contributions, budget, due effects, created conditions/reservations/effects, expiration notices, outcome. | History, explanation, and deterministic save reconstruction. |

The names for new fields can follow the existing module style, but their responsibilities and provenance must stay explicit. Namespace instances created by policies and event responses so similarly named choices cannot create duplicate queue IDs.

Keep the 12 base event definitions separate from the two review definitions. Only base events enter the shuffled starting deck. The event lookup and content validator must recognize both pools. Policy hand/deck accounting continues unchanged.

## Turn processing contract

1. **Reveal:** before revealing the next event, expire conditions outside their active ranges. Use the review reserved for that turn if present; otherwise shift one base event from the deck. Freeze all response modifiers and source explanations now. A review is considered revealed once; restoring a save must not consume another reservation or base event.
2. **Choose response:** lock one response using its frozen effects. Selecting a response or policy does not apply effects, charge payments, consume a review, or mutate future queues.
3. **Preview policy:** calculate immediate response and policy effects, scheduled effects due this turn, debt changes, and the normal budget. Also calculate proposed future effects, conditions, and review reservations. This is a pure calculation; repeated previews leave the live state and random state unchanged.
4. **Resolve:** use that same calculation to commit the turn. Add both choices' new scheduled effects once, consume existing due effects once, commit new conditions/reservations once, and record their sources. Debt interest and Treasury clamping retain their current ordering. Check collapse before the final-turn election.
5. **Report and advance:** show the settled causes and future consequences. Mark conditions expiring after the current turn. Advance to the next reveal unless the run has ended; do not add turns or make an unanswered review choice at the result screen.

For revealed responses, keep the base event amounts, old threshold modifiers, new condition modifiers, and any modifier-cap correction as distinct contribution records. Their sum must equal the displayed response effects. Settlement adds those contributions once; it must not add the final response total again.

The current shared `calculateTurn` preview/report calculation remains the authority for meter outcomes. `forecastBudget` continues to forecast known scheduled effects and debt, without assuming a future review response or a conditional protection benefit.

## Player-facing changes

### Before committing

Add a short consequence line to relevant policy cards: "Creates capacity strain for the next 3 turns," or "Schedules a wage-support review on turn 8." Selecting a card previews the conditions and reviews it would create, alongside the existing immediate meters and budget.

### During the term

Add a compact **Nation conditions** area with source, expiration, and the specific event changes. Keep guaranteed payments and benefits in **Upcoming consequences**, and add scheduled reviews there with their reserved turns.

On an affected event, show a readable explanation such as: "Emergency preparedness from turn 3 reduces this response's Treasury cost by 3." If several causes apply, show each and the resulting total. Preserve the exact response effect chips and settlement forecast.

For a review, add a source line such as "This decision follows your wage-support policy enacted on turn 2." State both response options and their immediate and future effects before the response is locked. A review renewal's later payments must also appear in the policy-phase forecast.

### After settlement

Report conditions created or expired, reviews scheduled, and the causes that changed the event. Include these causes in detailed meter contributions rather than folding them invisibly into the base event amount.

### At the end

Add a short **What your government leaves behind** section: debt, remaining payments and benefits, active conditions with expiration turns, and unresolved reviews. Identify the original decisions that caused them. An unanswered review has options, not an assumed meter change.

This report prepares for future inter-term carryover, but the consequences milestone still ends after the first election.

Use a neutral legacy report for both election outcomes. If the government collapses earlier, identify which debts, payments, and reviews were outstanding when the run ended; do not imply that future simulated turns have taken place.

## Implementation outline

- `js/content.js`: declarative condition definitions, source-policy links, event-response modifiers, and a separate pool for the two review events. Validate IDs, durations, targets, and immediate/future effects alongside current content validation.
- `js/engine.js`: add conditions and review reservations to state; extend future-effect scheduling to event responses; calculate prospective changes in the pure preview; commit them exactly once during resolution; expire conditions and select the next event during advance. Keep the scheduled meter-effect queue as the sole source of those dated payments and benefits.
- Use one shared calculation for preview and settlement, including prospective review reservations. A preview never mutates the state, reserves a real slot, or consumes a deck entry.
- Store condition and review records with stable IDs, source policy/turn, timing, and report links. Record which modifiers affected each revealed response and each settled meter.
- `js/view.js`, `term.css`, and briefing text: present conditions, scheduled reviews, causal explanations, and the end-of-term record without adding another mandatory phase.
- `js/storage.js` and launch handling in `js/main.js`: include the new records and review choices in reconstruction and canonical validation. Update rule/content versions. Identify incompatible older saves clearly and preserve their stored data through quick play and cancellation, until a player explicitly starts a replacement term.
- `scripts/strategies.mjs` and `scripts/balance.mjs`: understand review choices and relevant conditional protection using visible state and history. Do not inspect hidden future deck order to evaluate a choice. Compare the existing four strategy styles and record how often each consequence actually applied.
- Preserve the pre-change balance report as a separate baseline. Update briefing text, README, and plan status after implementation to describe actual behavior, including the fact that reviews occupy some of the 12 event slots.

## Verification and completion criteria

Focused engine and storage checks should verify:

- A condition starts next turn, applies through its advertised final turn, and expires on time.
- Earlier preparation reduces the correct event response, and an unrelated event is unchanged.
- Opposing modifiers, threshold effects, and the new modifier cap have separate, correct causes.
- Current revealed event costs stay fixed through policy selection and reload.
- Repeated previews do not create conditions, reserve reviews, or consume events. A committed source action creates its consequence once.
- Two reviews targeting the same turn reserve distinct, visible turns without losing or duplicating base events.
- Reviews still require a policy phase, and a review on turn 12 obeys the normal election/collapse ordering.
- Existing scheduled bills and investment benefits resolve once. Review renewals add only their new obligations.
- A wage review delayed by a collision creates no extra gap payment; renewing creates two payments on the advertised later turns.
- Review reservations are not placed in the shuffled base deck. Revealing a review does not also consume a base event, and durations still advance by one turn.
- Same seed and choices reproduce the full sequence; saves restore each phase with identical conditions, reservations, hand, and previews.
- Altered condition timing, review reservations, frozen modifiers, or scheduled payments are rejected by save reconstruction.
- Turn-12 choices disclose consequences beyond the term without silently applying them or adding turns.
- Quick-scenario results remain unchanged.

Run the existing tests and syntax checks, compare strategies over the fixed seed set against the current baseline, and manually play both protective and risk-taking routes. Verify keyboard flow, mobile readability, causal explanations, and a save/reload near a condition expiration and a review collision.

Use `npm test`, `npm run check`, and `npm run balance`. Treat the existing scripted results as a comparison, not a target survival percentage. Also inspect consequence activation frequency, debt and Treasury at the end, election losses, and whether some choices become automatic or practically useless. Re-run affected checks after balance changes. Further human playtesting should assess whether the timing and tradeoffs are understandable and interesting.

Done when all four conditions and both review events are playable, a player can trace a later cost or benefit back to a specific earlier decision, previews still match settlement, and saved runs restore exactly. All current first-term outcome types remain reachable, original quick-scenario results are preserved, and consequences beyond the term are visible without being silently applied. Human playtesting must decide whether the timing and choices feel fair; scripted survival percentages alone are insufficient.

## Later expansions

After this layer is understandable and balanced, consider larger event chains, ways to repeal ongoing programs, decision-driven event probabilities, and second-term carryover. Keep those separate so the first consequences milestone stays testable and playable.
