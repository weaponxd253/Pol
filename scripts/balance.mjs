import { mkdir, writeFile } from 'node:fs/promises';
import { play } from './strategies.mjs';
import { CONTENT_VERSION, RULES_VERSION, NATION_CONDITIONS, getScenario } from '../js/content.js';

const strategies = ['public', 'fiscal', 'investment', 'adaptive'];
const runs = strategies.flatMap(strategy => Array.from({ length: 20 }, (_, index) => {
  const seed = 'ARDEN-' + (index + 1);
  const state = play(seed, strategy);
  const created = state.history.flatMap(report => report.newConditions);
  const applications = state.history.flatMap(report => [...new Set(report.conditionApplications.map(item => item.sourceId))]);
  const conditions = Object.fromEntries(NATION_CONDITIONS.map(definition => [definition.id, {
    created: created.filter(item => item.conditionId === definition.id).length,
    appliedEvents: state.history.filter(report => report.conditionApplications.some(item => item.conditionId === definition.id)).length,
    expiredUnused: created.filter(item => item.conditionId === definition.id && item.lastTurn <= state.turn && !applications.includes(item.id)).length,
  }]));
  return { seed, strategy, outcome: state.outcome, turns: state.turn, meters: state.meters, debt: state.debt, conditions,
    reviewsSeen: state.history.filter(report => report.eventOrigin === 'review').map(report => report.eventId),
    choices: state.history.map(report => ({ eventId: report.eventId, responseId: report.responseId, policyId: report.policyId })) };
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
const consequences = strategies.map(strategy => {
  const group = runs.filter(run => run.strategy === strategy);
  return { strategy, reviewsSeen: group.reduce((sum, run) => sum + run.reviewsSeen.length, 0), conditions: Object.fromEntries(NATION_CONDITIONS.map(definition => [definition.id, Object.fromEntries(['created', 'appliedEvents', 'expiredUnused'].map(metric => [metric, group.reduce((sum, run) => sum + run.conditions[definition.id][metric], 0)]))])) };
});
await writeFile(new URL('../artifacts/balance-report.json', import.meta.url), JSON.stringify({ contentVersion: CONTENT_VERSION, rulesVersion: RULES_VERSION, startingTreasury: getScenario('term').treasury, electionTarget: 50, seeds: 20, runs: runs.length, summary, consequences, samples: runs }, null, 2));
console.table(summary);
console.log('80 scripted runs across 20 shared seeds. These comparisons do not prove every seed is winnable.');
