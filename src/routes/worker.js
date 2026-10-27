import express from 'express';

import { byId, casesOfWorker, insert, shiftsOf, skillsOf, feedbackOf, all } from '../store.js';
import { requireWorker } from '../middleware/session.js';
import { industryOf, LOCALES } from '../config.js';
import { buildPayslip } from '../domain/payroll.js';
import {
  formatDuration,
  isOpen,
  minutesInWeek,
  totalsFor,
  weekToDate,
  workedMinutes,
} from '../domain/shifts.js';
import { fatigueRisk } from '../domain/fatigue.js';
import { createCase, effectiveStatus, hoursRemaining } from '../domain/cases.js';
import { analyseText } from '../ai/themes.js';

const router = express.Router();

router.use(requireWorker);

function context(req) {
  const worker = byId('workers', req.session.workerId);
  if (!worker) return null;
  const org = byId('orgs', worker.orgId);
  const industry = industryOf(org?.industry);
  const shifts = shiftsOf(worker.id);
  return { worker, org, industry, shifts };
}

function monthWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = now;
  const fmt = (date) =>
    date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
}

router.get('/w', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const { worker, org, industry, shifts } = ctx;
  const active = shifts.find(isOpen) || null;
  const thisWeek = weekToDate(shifts);
  const weekly = totalsFor(thisWeek, { thresholdMinutes: industry.dailyThresholdMinutes });
  const risk = fatigueRisk({ worker, shifts, industryId: industry.id });
  const myCases = casesOfWorker(worker.id);

  res.render('worker/home', {
    title: worker.name,
    worker,
    org,
    industry,
    active,
    activeMinutes: active ? workedMinutes(active) : 0,
    weekly,
    weeklyMinutes: minutesInWeek(shifts),
    risk,
    openCases: myCases.filter((item) => item.status !== 'resolved').length,
    lastShift: [...shifts].reverse()[0] || null,
  });
});

router.get('/w/checkin', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');
  const { shifts, industry } = ctx;
  const active = shifts.find(isOpen) || null;
  const recent = [...shifts].reverse().slice(0, 7).map((shift) => ({
    ...shift,
    minutes: workedMinutes(shift),
    overtime: Math.max(0, workedMinutes(shift) - industry.dailyThresholdMinutes),
  }));

  res.render('worker/checkin', {
    title: 'Check in',
    ...ctx,
    active,
    activeMinutes: active ? workedMinutes(active) : 0,
    recent,
    notice: req.query.ok || '',
  });
});

router.post('/w/checkin', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const code = String(req.body.siteCode || '').trim();
  if (!code) return res.redirect('/w/checkin?ok=codeRequired');
  if (code !== ctx.org.siteCode) return res.redirect('/w/checkin?ok=badCode');

  const alreadyOpen = ctx.shifts.find(isOpen);
  if (alreadyOpen) return res.redirect('/w/checkin?ok=alreadyOpen');

  insert('shifts', {
    id: `s_${ctx.worker.id}_${Date.now()}`,
    workerId: ctx.worker.id,
    orgId: ctx.org.id,
    date: new Date().toISOString().slice(0, 10),
    start: new Date().toISOString(),
    end: null,
    breakMinutes: ctx.industry.id === 'construction' ? 60 : 45,
    source: 'code',
    disputed: false,
  });

  res.redirect('/w/checkin?ok=checkedIn');
});

router.post('/w/checkout', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const active = ctx.shifts.find(isOpen);
  if (!active) return res.redirect('/w/checkin?ok=notCheckedIn');

  active.end = new Date().toISOString();
  res.redirect('/w/checkin?ok=checkedOut');
});

router.get('/w/payslip', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const window = monthWindow();
  const monthShifts = ctx.shifts.filter((shift) => new Date(shift.start) >= window.start);
  const payslip = buildPayslip({
    worker: ctx.worker,
    shifts: monthShifts,
    industryId: ctx.industry.id,
    periodLabel: window.label,
  });

  res.render('worker/payslip', {
    title: 'Payslip',
    ...ctx,
    payslip,
    monthShifts,
    notice: req.query.ok || '',
    formatDuration,
  });
});

router.post('/w/payslip/dispute', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const shiftId = String(req.body.shiftId || '');
  const shift = ctx.shifts.find((item) => item.id === shiftId);
  if (shift && shift.end) shift.disputed = true;

  res.redirect('/w/payslip?ok=disputed');
});

router.get('/w/report', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const mine = casesOfWorker(ctx.worker.id);
  res.render('worker/report', {
    title: 'Report',
    ...ctx,
    mine,
    effectiveStatus,
    hoursRemaining,
    notice: req.query.ok || '',
  });
});

router.post('/w/report', async (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const text = String(req.body.text || '').trim().slice(0, 1200);
  if (text.length < 5) return res.redirect('/w/report?ok=tooShort');

  const type = req.body.type === 'safety' ? 'safety' : 'grievance';
  const anonymous = req.body.anonymous === 'on';
  const category = String(req.body.category || (type === 'safety' ? 'Safety' : 'General')).slice(0, 80);

  const analysis = await analyseText(text, { lang: req.locale });
  const severity = type === 'safety' ? (analysis.severity === 'low' ? 'medium' : analysis.severity) : analysis.severity;

  const item = createCase({
    orgId: ctx.org.id,
    workerId: ctx.worker.id,
    anonymous,
    type,
    category,
    text,
    lang: req.locale,
    severity,
  });
  item.theme = analysis.theme;
  item.aiSource = analysis.source;
  insert('cases', item);

  res.redirect('/w/report?ok=submitted');
});

router.get('/w/feedback', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const mine = feedbackOf(ctx.org.id).filter((item) => item.workerId === ctx.worker.id);
  res.render('worker/feedback', {
    title: 'Feedback',
    ...ctx,
    mine,
    notice: req.query.ok || '',
  });
});

router.post('/w/feedback', async (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const text = String(req.body.text || '').trim().slice(0, 1200);
  if (text.length < 5) return res.redirect('/w/feedback?ok=tooShort');

  const anonymous = req.body.anonymous === 'on';
  const analysis = await analyseText(text, { lang: req.locale });

  insert('feedback', {
    id: `f_${Date.now()}`,
    orgId: ctx.org.id,
    workerId: anonymous ? null : ctx.worker.id,
    anonymous,
    lang: req.locale,
    text,
    theme: analysis.theme,
    sentiment: analysis.sentiment,
    severity: analysis.severity,
    source: analysis.source,
    createdAt: new Date().toISOString(),
  });

  res.redirect('/w/feedback?ok=thanks');
});

router.get('/w/skills', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  res.render('worker/skills', {
    title: 'Skill passport',
    ...ctx,
    skills: skillsOf(ctx.worker.id),
    notice: req.query.ok || '',
  });
});

router.post('/w/skills', (req, res) => {
  const ctx = context(req);
  if (!ctx) return res.redirect('/login');

  const title = String(req.body.title || '').trim().slice(0, 120);
  if (title.length < 3) return res.redirect('/w/skills?ok=tooShort');

  insert('skills', {
    id: `sk_${Date.now()}`,
    workerId: ctx.worker.id,
    title,
    issuer: String(req.body.issuer || '').trim().slice(0, 120) || 'Self-reported',
    year: Number(req.body.year) || new Date().getFullYear(),
    verified: false,
    addedAt: new Date().toISOString(),
  });

  res.redirect('/w/skills?ok=added');
});

export default router;
