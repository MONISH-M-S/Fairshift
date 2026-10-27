import express from 'express';

import { byId, casesOf, casesOfWorker, feedbackOf, shiftsInOrg, shiftsOf, skillsOf, workersOf } from '../store.js';
import { requireAdmin } from '../middleware/session.js';
import { industryOf } from '../config.js';
import { fatigueRisk, riskRank } from '../domain/fatigue.js';
import {
  advance,
  effectiveStatus,
  hoursRemaining,
  isOpenCase,
  summariseCases,
} from '../domain/cases.js';
import { minutesInWeek, totalsFor, weekToDate, workedMinutes, isOpen } from '../domain/shifts.js';
import { themeBreakdown } from '../ai/themes.js';
import { buildPayslip } from '../domain/payroll.js';

const router = express.Router();

router.use(requireAdmin);

function context(req) {
  const org = byId('orgs', req.session.orgId);
  if (!org) return null;
  return { org, industry: industryOf(org.industry) };
}

function lastDays(count, now = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (count - 1 - index));
    return date;
  });
}

router.get('/admin', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const { org, industry } = ctx;
  const workers = workersOf(org.id);
  const orgShifts = shiftsInOrg(org.id);
  const cases = casesOf(org.id);
  const feedback = feedbackOf(org.id);

  const rows = workers
    .map((worker) => {
      const shifts = shiftsOf(worker.id);
      const risk = fatigueRisk({ worker, shifts, industryId: industry.id });
      const openCases = casesOfWorker(worker.id).filter(isOpenCase).length;
      const negative = feedback.filter((item) => item.workerId === worker.id && item.sentiment === 'negative').length;
      const leaveRisk = Math.min(100, Math.round(risk.score * 0.6 + openCases * 15 + negative * 10));
      return { worker, risk, openCases, leaveRisk, weeklyMinutes: minutesInWeek(shifts) };
    })
    .sort((a, b) => b.leaveRisk - a.leaveRisk || riskRank(a.risk.level) - riskRank(b.risk.level));

  const trend = lastDays(7).map((date) => {
    const key = date.toISOString().slice(0, 10);
    const dayShifts = orgShifts.filter((shift) => shift.date === key);
    const present = new Set(dayShifts.map((shift) => shift.workerId)).size;
    const minutes = dayShifts.reduce((total, shift) => total + workedMinutes(shift), 0);
    return { key, label: date.toLocaleDateString('en-IN', { weekday: 'short' }), present, minutes };
  });

  const onSiteNow = orgShifts.filter(isOpen).length;
  const weekTotals = totalsFor(weekToDate(orgShifts), {
    thresholdMinutes: industry.dailyThresholdMinutes,
  });

  res.render('employer/dashboard', {
    title: 'Dashboard',
    ...ctx,
    rows,
    trend,
    maxPresent: Math.max(1, ...trend.map((day) => day.present)),
    stats: summariseCases(cases),
    themes: themeBreakdown(feedback).slice(0, 6),
    recentCases: cases.slice(0, 5),
    effectiveStatus,
    hoursRemaining,
    onSiteNow,
    weekTotals,
    disputed: orgShifts.filter((shift) => shift.disputed).length,
    headcount: workers.length,
  });
});

router.get('/admin/cases', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const filter = String(req.query.filter || 'open');
  const all = casesOf(ctx.org.id);
  const rows = all.filter((item) => {
    const status = effectiveStatus(item);
    if (filter === 'all') return true;
    if (filter === 'overdue') return status === 'overdue';
    if (filter === 'resolved') return status === 'resolved';
    return status !== 'resolved';
  });

  res.render('employer/cases', {
    title: 'Cases',
    ...ctx,
    rows,
    filter,
    counts: summariseCases(all),
    effectiveStatus,
    hoursRemaining,
  });
});

router.post('/admin/cases/:id/status', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const item = byId('cases', req.params.id);
  if (!item || item.orgId !== ctx.org.id) return res.status(404).render('error', { title: 'Not found' });

  const to = String(req.body.status || '');
  advance(item, to, String(req.body.note || '').slice(0, 200));

  const back = String(req.body.back || '/admin/cases');
  res.redirect(back.startsWith('/admin') ? back : '/admin/cases');
});

router.get('/admin/workers/:id', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const worker = byId('workers', req.params.id);
  if (!worker || worker.orgId !== ctx.org.id || worker.admin) {
    return res.status(404).render('error', { title: 'Not found' });
  }

  const shifts = shiftsOf(worker.id);
  const risk = fatigueRisk({ worker, shifts, industryId: ctx.industry.id });
  const monthShifts = shifts.filter((shift) => {
    const now = new Date();
    return new Date(shift.start) >= new Date(now.getFullYear(), now.getMonth(), 1);
  });

  res.render('employer/worker', {
    title: worker.name,
    ...ctx,
    worker,
    shifts: [...shifts].reverse().slice(0, 10),
    risk,
    skills: skillsOf(worker.id),
    cases: casesOfWorker(worker.id),
    payslip: buildPayslip({
      worker,
      shifts: monthShifts,
      industryId: ctx.industry.id,
      periodLabel: 'This month',
    }),
    effectiveStatus,
    hoursRemaining,
  });
});

export default router;
