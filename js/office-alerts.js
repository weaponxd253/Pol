import { METERS, getScenario } from './content.js';

export function governmentWarning(state) {
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
    .filter(meter => meter.value <= 20)
    .sort((a, b) => a.value - b.value);
  if (!warnings.length) return null;

  const critical = warnings[0].value <= 10;
  return {
    severity: critical ? 'critical' : 'warning',
    title: critical ? 'Government crisis' : 'Government warning',
    message: warnings.map(meter => `${meter.label} ${meter.value}/100`).join(' · ')
  };
}

export function treasuryWarning(state) {
  if (state.outcome) return null;

  const firstUnsettledTurn = state.phase === 'report' ? state.turn + 1 : state.turn;
  const lastTurn = Math.min(state.turn + 1, getScenario(state.mode).turns);
  const payments = state.scheduledEffects.filter(effect =>
    effect.meter === 'treasury' && effect.amount < 0 &&
    effect.dueTurn >= firstUnsettledTurn && effect.dueTurn <= lastTurn
  );
  if (!payments.length) return null;

  const dueTurn = Math.min(...payments.map(effect => effect.dueTurn));
  const due = payments.filter(effect => effect.dueTurn === dueTurn);
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

