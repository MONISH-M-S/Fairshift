import { industryOf } from '../config.js';

const MINUTE = 60 * 1000;

export const isOpen = (shift) => !shift.end;

/**
 * Minutes actually paid for a shift: wall-clock time minus the unpaid break.
 * Open shifts are measured up to `now` so a live check-in still counts.
 */
export function workedMinutes(shift, now = new Date()) {
  const start = new Date(shift.start).getTime();
  const end = shift.end ? new Date(shift.end).getTime() : now.getTime();
  const gross = Math.max(0, Math.round((end - start) / MINUTE));
  const unpaid = Math.min(Math.max(0, shift.breakMinutes || 0), gross);
  return gross - unpaid;
}

/** Split a single day into regular time and overtime at the daily threshold. */
export function splitDay(minutes, thresholdMinutes = 480) {
  const safe = Math.max(0, Math.round(minutes));
  const regular = Math.min(safe, thresholdMinutes);
  return { regular, overtime: safe - regular };
}

/** Aggregate a set of shifts into regular and overtime minutes. */
export function totalsFor(shifts, options = {}) {
  const { thresholdMinutes = 480, now = new Date() } = options;
  let regularMinutes = 0;
  let overtimeMinutes = 0;
  let workedMinuteTotal = 0;

  for (const shift of shifts) {
    const minutes = workedMinutes(shift, now);
    workedMinuteTotal += minutes;
    const split = splitDay(minutes, thresholdMinutes);
    regularMinutes += split.regular;
    overtimeMinutes += split.overtime;
  }

  return { regularMinutes, overtimeMinutes, workedMinuteTotal };
}

export function mondayOf(reference = new Date()) {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  const dayIndex = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - dayIndex);
  return date;
}

export function weekToDate(shifts, reference = new Date()) {
  const monday = mondayOf(reference).getTime();
  const end = new Date(reference).getTime() + MINUTE * 60;
  return shifts.filter((shift) => {
    const start = new Date(shift.start).getTime();
    return start >= monday && start <= end;
  });
}

export function minutesInWeek(shifts, reference = new Date(), now = new Date()) {
  return weekToDate(shifts, reference).reduce(
    (total, shift) => total + workedMinutes(shift, now),
    0
  );
}

/** Hours of rest between the end of one shift and the start of the next. */
export function restGapHours(earlier, later) {
  if (!earlier?.end || !later?.start) return null;
  const gap = new Date(later.start).getTime() - new Date(earlier.end).getTime();
  return gap / (MINUTE * 60);
}

/** Longest run of consecutive calendar days that have at least one shift. */
export function longestConsecutiveRun(shifts) {
  const days = [...new Set(shifts.map((shift) => shift.date))].sort();
  if (days.length === 0) return 0;

  let best = 1;
  let current = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = new Date(`${days[index - 1]}T00:00:00`);
    const thisDay = new Date(`${days[index]}T00:00:00`);
    const gapDays = Math.round((thisDay - previous) / (24 * MINUTE * 60));
    current = gapDays === 1 ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
}

/** The run of consecutive days ending on the most recent shift. */
export function currentStreak(shifts) {
  const days = [...new Set(shifts.map((shift) => shift.date))].sort();
  if (days.length === 0) return 0;

  let streak = 1;
  for (let index = days.length - 1; index > 0; index -= 1) {
    const next = new Date(`${days[index]}T00:00:00`);
    const previous = new Date(`${days[index - 1]}T00:00:00`);
    if (Math.round((next - previous) / (24 * MINUTE * 60)) === 1) streak += 1;
    else break;
  }
  return streak;
}

/** Minimum rest observed anywhere in the shift list. */
export function minimumRestGap(shifts) {
  const ordered = [...shifts].sort((a, b) => a.start.localeCompare(b.start));
  let minimum = null;
  for (let index = 1; index < ordered.length; index += 1) {
    const gap = restGapHours(ordered[index - 1], ordered[index]);
    if (gap === null) continue;
    if (minimum === null || gap < minimum) minimum = gap;
  }
  return minimum;
}

/** Hours for a human badge, e.g. 7.5 -> "7h 30m". */
export function formatDuration(minutes, clock = { hours: 'h', minutes: 'm' }) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}${clock.minutes}`;
  if (rest === 0) return `${hours}${clock.hours}`;
  return `${hours}${clock.hours} ${rest}${clock.minutes}`;
}

export const industryRules = (industryId) => industryOf(industryId);
