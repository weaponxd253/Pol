import { METERS, getScenario } from './content.js';

export function meterWarningSeverity(value) {
  return value <= 10 ? 'critical' : value <= 20 ? 'warning' : null;
}

export function governmentWarning(state, monitoredMeters) {
  if (state.outcome === 'collapsed') {
    const causes = state.history.at(-1)?.failures.map(failure => failure.failure).join(' ');
    const destination = state.phase === 'report' ? 'the final Cabinet Report' : 'Final Results';
    return {
      severity: 'critical',
      title: 'Government collapse',
      message: [causes, `Open ${destination} to review the outcome.`].filter(Boolean).join(' ')
    };
  }

  if (state.outcome) return null;

  const warnings = METERS.map(meter => ({ ...meter, value: state.meters[meter.id] }))
    .filter(meter => (!monitoredMeters || monitoredMeters.includes(meter.id)) && meterWarningSeverity(meter.value))
    .sort((a, b) => a.value - b.value);
  if (!warnings.length) return null;

  const critical = meterWarningSeverity(warnings[0].value) === 'critical';
  return {
    severity: critical ? 'critical' : 'warning',
    title: critical ? 'Government crisis' : 'Government warning',
    message: warnings.map(meter => `${meter.label} ${meter.value}/100`).join(' · ')
  };
}

export function treasuryPaymentsDueSoon(state) {
  if (state.outcome) return [];
  const firstUnsettledTurn = state.phase === 'report' ? state.turn + 1 : state.turn;
  const lastTurn = Math.min(state.turn + 1, getScenario(state.mode).turns);
  const groups = new Map();
  for (const effect of state.scheduledEffects.filter(effect =>
    effect.meter === 'treasury' && effect.amount < 0 &&
    effect.dueTurn >= firstUnsettledTurn && effect.dueTurn <= lastTurn
  )) {
    if (!groups.has(effect.dueTurn)) groups.set(effect.dueTurn, []);
    groups.get(effect.dueTurn).push(effect);
  }
  return [...groups].sort(([a], [b]) => a - b);
}

export function treasuryWarning(state, targetTurn) {
  const groups = treasuryPaymentsDueSoon(state);
  const [dueTurn, due] = (targetTurn === undefined ? groups[0] : groups.find(([turn]) => turn === targetTurn)) ?? [];
  if (!due) return null;
  const total = due.reduce((sum, effect) => sum - effect.amount, 0);
  const buffer = state.meters.treasury - total;
  const severity = buffer <= 0 ? 'critical' : buffer <= 10 ? 'urgent' : 'normal';
  const timing = dueTurn === state.turn ? 'due this turn' : 'due next turn';
  const sources = [...new Set(due.map(effect => effect.source))].join(', ');

  return {
    severity,
    dueTurn,
    title: severity === 'critical' ? 'Treasury payment risk'
      : severity === 'urgent' ? 'Low Treasury buffer' : 'Scheduled Treasury payment',
    message: `Turn ${dueTurn} · ${total} Treasury ${timing} (${sources}). ` +
      (buffer < 0 ? `Current funds fall short by ${-buffer} before other turn effects.`
        : `These payments leave ${buffer} Treasury before other turn effects.`)
  };
}

