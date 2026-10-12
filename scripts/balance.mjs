import { mkdir, writeFile } from 'node:fs/promises';
import { play } from './strategies.mjs';
import { CONTENT_VERSION, RULES_VERSION, getScenario } from '../js/content.js';

const strategies = ['public', 'fiscal', 'investment', 'adaptive'];
const runs = strategies.flatMap(strategy => Array.from({ length: 20 }, (_, index) => {
  const seed = 'ARDEN-' + (index + 1);
  const state = play(seed, strategy);
  return { seed, strategy, outcome: state.outcome, turns: state.turn, meters: state.meters, debt: state.debt, choices: state.history.map(report => ({ responseId: report.responseId, policyId: report.policyId })) };
}));
const summary = strategies.map(strategy => {
  const group = runs.filter(run => run.strategy === strategy);
  return {
    strategy, reelected: group.filter(run => run.outcome === 'reelected').length,
    electionLost: group.filter(run => run.outcome === 'election-lost').length,
    collapsed: group.filter(run => run.outcome === 'collapsed').length,
    averageApproval: Math.round(group.reduce((sum, run) => sum + run.meters.approval, 0) / group.length),
    averageTreasury: Math.round(group.reduce((sum, run) => sum + run.meters.treasury, 0) / group.length),
    averageDebt: Math.round(group.reduce((sum, run) => sum + run.debt, 0) / group.length),
  };
});
await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
await writeFile(new URL('../artifacts/balance-report.json', import.meta.url), JSON.stringify({ contentVersion: CONTENT_VERSION, rulesVersion: RULES_VERSION, startingTreasury: getScenario('term').treasury, electionTarget: 50, seeds: 20, runs: runs.length, summary, samples: runs }, null, 2));
console.table(summary);
console.log('80 scripted runs across 20 shared seeds. These comparisons do not prove every seed is winnable.');
