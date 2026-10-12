import test from 'node:test';
import assert from 'node:assert/strict';
import { renderGame } from '../js/view.js';
import { play } from '../scripts/strategies.mjs';

test('complete result screens distinguish election wins, losses, and collapse with full history and future budgets', () => {
  const cases = [
    ['adaptive', 'reelected', /You have been re-elected/],
    ['fiscal', 'election-lost', /The election is lost/],
    ['reckless', 'collapsed', /Government collapsed/],
  ];
  for (const [strategy, outcome, title] of cases) {
    const result = play('ARDEN-1', strategy);
    assert.equal(result.outcome, outcome);
    const screen = renderGame(result);
    assert.match(screen, title);
    assert.match(screen, /Next budget, before new decisions or events/);
    assert.match(screen, /Detailed turn reports/);
    assert.match(screen, /Replay this run/);
    assert.match(screen, /Start another run/);
    assert.doesNotMatch(screen, /Continue to term 2/);
  }
});
