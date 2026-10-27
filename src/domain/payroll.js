import { industryOf } from '../config.js';
import { splitDay, workedMinutes } from './shifts.js';

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Build a payslip that can be explained line by line.
 *
 * Every money line keeps the ids of the shifts that produced it, so a worker
 * can trace "where did this number come from?" instead of trusting a total.
 * Shifts the worker has disputed are held out of the payable total and surfaced
 * separately rather than silently dropped.
 */
export function buildPayslip({ worker, shifts, industryId, periodLabel = '', now = new Date() }) {
  const rules = industryOf(industryId || worker.industryId);
  const settled = shifts.filter((shift) => shift.end && !shift.disputed);
  const disputed = shifts.filter((shift) => shift.disputed);

  let regularMinutes = 0;
  let overtimeMinutes = 0;
  const regularShiftIds = [];
  const overtimeShiftIds = [];

  for (const shift of settled) {
    const minutes = workedMinutes(shift, now);
    const split = splitDay(minutes, rules.dailyThresholdMinutes);
    if (split.regular > 0) {
      regularMinutes += split.regular;
      regularShiftIds.push(shift.id);
    }
    if (split.overtime > 0) {
      overtimeMinutes += split.overtime;
      overtimeShiftIds.push(shift.id);
    }
  }

  const baseRate = Number(worker.hourlyRate) || 0;
  const overtimeRate = round2(baseRate * rules.overtimeMultiplier);

  const lines = [
    {
      key: 'regular',
      minutes: regularMinutes,
      rate: baseRate,
      amount: round2((regularMinutes / 60) * baseRate),
      shiftIds: regularShiftIds,
    },
    {
      key: 'overtime',
      minutes: overtimeMinutes,
      rate: overtimeRate,
      amount: round2((overtimeMinutes / 60) * overtimeRate),
      shiftIds: overtimeShiftIds,
    },
  ].filter((line) => line.minutes > 0);

  const gross = round2(lines.reduce((total, line) => total + line.amount, 0));

  const deductions = (rules.deductions || []).map((deduction) => ({
    key: deduction.key,
    label: deduction.label,
    amount: round2((gross * deduction.percent) / 100),
  }));

  const deductionTotal = round2(deductions.reduce((total, item) => total + item.amount, 0));
  const net = round2(gross - deductionTotal);

  const payableMinutes = regularMinutes + overtimeMinutes;

  return {
    workerId: worker.id,
    workerName: worker.name,
    orgId: worker.orgId,
    industryId: rules.id,
    periodLabel,
    currency: 'INR',
    baseRate,
    overtimeRate,
    overtimeMultiplier: rules.overtimeMultiplier,
    dailyThresholdMinutes: rules.dailyThresholdMinutes,
    lines,
    regularMinutes,
    overtimeMinutes,
    payableMinutes,
    gross,
    deductions,
    deductionTotal,
    net,
    disputed: disputed.map((shift) => ({
      id: shift.id,
      date: shift.date,
      minutes: workedMinutes(shift, now),
    })),
    shiftCount: settled.length,
    generatedAt: now.toISOString(),
  };
}

/** A short, human sentence explaining the overtime rule that was applied. */
export function overtimeExplanation(payslip) {
  const thresholdHours = payslip.dailyThresholdMinutes / 60;
  return {
    thresholdHours,
    multiplier: payslip.overtimeMultiplier,
  };
}
