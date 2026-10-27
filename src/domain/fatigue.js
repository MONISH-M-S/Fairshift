import { industryOf } from '../config.js';
import { currentStreak, minimumRestGap, minutesInWeek, workedMinutes, isOpen } from './shifts.js';

export const WEIGHTS = {
  longWeek: 35,
  shortRest: 30,
  noDayOff: 25,
  longDay: 20,
  openShiftTooLong: 20,
};

/**
 * Rule-based fatigue score. Deliberately not an LLM call: a safety signal must
 * be identical every time it is computed, and explainable to a worker.
 */
export function fatigueRisk({ worker, shifts, industryId, now = new Date() }) {
  const rules = industryOf(industryId || worker.industryId);
  const weeklyMinutes = minutesInWeek(shifts, now, now);
  const streak = currentStreak(shifts);
  const restHours = minimumRestGap(shifts);
  const longestShift = shifts.reduce(
    (longest, shift) => Math.max(longest, workedMinutes(shift, now)),
    0
  );
  const openOver = shifts.some((shift) => isOpen(shift) && workedMinutes(shift, now) > 12 * 60);

  const flags = [];

  if (weeklyMinutes > rules.weeklyHourCap * 60) {
    flags.push({
      code: 'longWeek',
      detail: { minutes: weeklyMinutes, cap: rules.weeklyHourCap * 60 },
    });
  }
  if (restHours !== null && restHours < rules.minRestGapHours) {
    flags.push({
      code: 'shortRest',
      detail: { hours: Math.round(restHours * 10) / 10, minimum: rules.minRestGapHours },
    });
  }
  if (streak >= rules.maxConsecutiveDays) {
    flags.push({ code: 'noDayOff', detail: { days: streak } });
  }
  if (longestShift > 11 * 60) {
    flags.push({ code: 'longDay', detail: { minutes: longestShift } });
  }
  if (openOver) {
    flags.push({ code: 'openShiftTooLong', detail: {} });
  }

  const score = Math.min(
    100,
    flags.reduce((total, flag) => total + (WEIGHTS[flag.code] || 0), 0)
  );

  const level = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';

  return {
    workerId: worker.id,
    score,
    level,
    flags,
    weeklyMinutes,
    streak,
    restHours,
    longestShift,
  };
}

export function riskRank(level) {
  return { high: 0, medium: 1, low: 2 }[level] ?? 3;
}
