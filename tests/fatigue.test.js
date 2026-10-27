import test from 'node:test';
import assert from 'node:assert/strict';

import { fatigueRisk, riskRank } from '../src/domain/fatigue.js';
import { mondayOf } from '../src/domain/shifts.js';

test('fatigueRisk flags long weekly hours', () => {
  const worker = { id: 'w1', industryId: 'construction' };
  const now = new Date();
  const monday = mondayOf(now);

  // 5 shifts of 11 hours = 55 hours (cap is 48h) starting Monday of this week
  const shifts = [0, 1, 2, 3, 4].map((d) => {
    const shiftDate = new Date(monday.getTime() + d * 24 * 60 * 60 * 1000 + 8 * 3600 * 1000);
    const endDate = new Date(shiftDate.getTime() + 11 * 3600 * 1000);
    return {
      date: shiftDate.toISOString().slice(0, 10),
      start: shiftDate.toISOString(),
      end: endDate.toISOString(),
      breakMinutes: 0,
    };
  });

  const ref = new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000 + 20 * 3600 * 1000); // Friday night
  const risk = fatigueRisk({ worker, shifts, industryId: 'construction', now: ref });

  assert.ok(risk.flags.some((f) => f.code === 'longWeek'));
  assert.ok(risk.score >= 35);
  assert.notEqual(risk.level, 'low');
});

test('fatigueRisk flags short rest gap between consecutive shifts', () => {
  const worker = { id: 'w2', industryId: 'construction' };
  const shifts = [
    {
      date: '2026-10-20',
      start: '2026-10-20T14:00:00Z',
      end: '2026-10-20T23:00:00Z',
      breakMinutes: 0,
    },
    {
      date: '2026-10-21',
      start: '2026-10-21T06:00:00Z', // 7 hours rest (min required is 11h)
      end: '2026-10-21T14:00:00Z',
      breakMinutes: 0,
    },
  ];

  const risk = fatigueRisk({ worker, shifts, industryId: 'construction' });
  assert.ok(risk.flags.some((f) => f.code === 'shortRest'));
});

test('riskRank orders severity properly', () => {
  assert.equal(riskRank('high'), 0);
  assert.equal(riskRank('medium'), 1);
  assert.equal(riskRank('low'), 2);
});
