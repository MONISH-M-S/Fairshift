import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPayslip } from '../src/domain/payroll.js';

test('buildPayslip for Construction applies 1.5x OT multiplier with zero deductions', () => {
  const worker = { id: 'w1', name: 'Ravi', hourlyRate: 100, orgId: 'org1', industryId: 'construction' };
  const shifts = [
    {
      id: 's1',
      start: '2026-10-20T08:00:00Z',
      end: '2026-10-20T18:00:00Z', // 10 hours = 600m
      breakMinutes: 0,
      disputed: false,
    },
  ];

  const slip = buildPayslip({ worker, shifts, industryId: 'construction', periodLabel: 'Oct 2026' });

  // 8h regular at 100 = 800
  // 2h overtime at 150 (1.5x) = 300
  // Gross = 1100, Deductions = 0, Net = 1100
  assert.equal(slip.baseRate, 100);
  assert.equal(slip.overtimeRate, 150);
  assert.equal(slip.regularMinutes, 480);
  assert.equal(slip.overtimeMinutes, 120);
  assert.equal(slip.gross, 1100);
  assert.equal(slip.deductionTotal, 0);
  assert.equal(slip.net, 1100);
  assert.equal(slip.lines[0].shiftIds[0], 's1');
});

test('buildPayslip for College applies 1.25x OT and 12% PF deduction', () => {
  const worker = { id: 'w2', name: 'Divya', hourlyRate: 200, orgId: 'org2', industryId: 'college' };
  const shifts = [
    {
      id: 's2',
      start: '2026-10-20T09:00:00Z',
      end: '2026-10-20T17:00:00Z', // 8 hours = 480m regular
      breakMinutes: 0,
      disputed: false,
    },
  ];

  const slip = buildPayslip({ worker, shifts, industryId: 'college' });

  // 8h at 200 = 1600 gross
  // PF = 12% of 1600 = 192
  // Net = 1600 - 192 = 1408
  assert.equal(slip.gross, 1600);
  assert.equal(slip.deductionTotal, 192);
  assert.equal(slip.net, 1408);
  assert.equal(slip.deductions[0].key, 'pf');
});

test('buildPayslip isolates disputed shifts from payable total', () => {
  const worker = { id: 'w3', name: 'Kumar', hourlyRate: 100, orgId: 'org1' };
  const shifts = [
    {
      id: 's_ok',
      start: '2026-10-20T08:00:00Z',
      end: '2026-10-20T16:00:00Z', // 8h
      breakMinutes: 0,
      disputed: false,
    },
    {
      id: 's_disputed',
      start: '2026-10-21T08:00:00Z',
      end: '2026-10-21T16:00:00Z', // 8h disputed
      breakMinutes: 0,
      disputed: true,
    },
  ];

  const slip = buildPayslip({ worker, shifts, industryId: 'construction' });

  // Only s_ok is settled
  assert.equal(slip.shiftCount, 1);
  assert.equal(slip.gross, 800);
  assert.equal(slip.disputed.length, 1);
  assert.equal(slip.disputed[0].id, 's_disputed');
});
