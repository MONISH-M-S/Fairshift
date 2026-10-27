import test from 'node:test';
import assert from 'node:assert/strict';

import {
  workedMinutes,
  splitDay,
  totalsFor,
  currentStreak,
  minimumRestGap,
  restGapHours,
  formatDuration,
} from '../src/domain/shifts.js';

test('workedMinutes computes gross minus unpaid break', () => {
  const shift = {
    start: '2026-10-20T08:00:00.000Z',
    end: '2026-10-20T17:00:00.000Z', // 9 hours = 540 min
    breakMinutes: 60,
  };
  assert.equal(workedMinutes(shift), 480); // 8 hours = 480 min
});

test('workedMinutes handles open active shift up to now', () => {
  const start = new Date(Date.now() - 120 * 60 * 1000).toISOString(); // 2 hours ago
  const shift = {
    start,
    end: null,
    breakMinutes: 15,
  };
  const now = new Date();
  const minutes = workedMinutes(shift, now);
  assert.ok(minutes >= 100 && minutes <= 110);
});

test('splitDay separates regular from overtime at threshold', () => {
  const res = splitDay(600, 480); // 10 hours at 8h threshold
  assert.equal(res.regular, 480);
  assert.equal(res.overtime, 120);

  const under = splitDay(360, 480);
  assert.equal(under.regular, 360);
  assert.equal(under.overtime, 0);
});

test('totalsFor aggregates multiple shifts', () => {
  const shifts = [
    { start: '2026-10-20T08:00:00Z', end: '2026-10-20T16:00:00Z', breakMinutes: 0 }, // 480m
    { start: '2026-10-21T08:00:00Z', end: '2026-10-21T18:00:00Z', breakMinutes: 0 }, // 600m (480 regular + 120 ot)
  ];
  const totals = totalsFor(shifts, { thresholdMinutes: 480 });
  assert.equal(totals.workedMinuteTotal, 1080);
  assert.equal(totals.regularMinutes, 960);
  assert.equal(totals.overtimeMinutes, 120);
});

test('restGapHours calculates hours between consecutive shifts', () => {
  const s1 = { end: '2026-10-20T22:00:00Z' };
  const s2 = { start: '2026-10-21T07:00:00Z' }; // 9 hours rest
  assert.equal(restGapHours(s1, s2), 9);
});

test('currentStreak calculates consecutive working days', () => {
  const shifts = [
    { date: '2026-10-20' },
    { date: '2026-10-21' },
    { date: '2026-10-22' },
    { date: '2026-10-23' },
  ];
  assert.equal(currentStreak(shifts), 4);
});

test('formatDuration formats clock strings correctly', () => {
  assert.equal(formatDuration(90), '1h 30m');
  assert.equal(formatDuration(120), '2h');
  assert.equal(formatDuration(45), '45m');
});
