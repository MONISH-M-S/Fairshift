export const SLA_HOURS = { high: 24, medium: 48, low: 72 };

export const SEVERITIES = ['high', 'medium', 'low'];
export const CASE_TYPES = ['grievance', 'safety'];

export const TRANSITIONS = {
  open: ['acknowledged', 'resolved'],
  acknowledged: ['resolved'],
  resolved: [],
};

export function dueAtFor(severity, createdAt) {
  const hours = SLA_HOURS[severity] ?? SLA_HOURS.medium;
  return new Date(new Date(createdAt).getTime() + hours * 60 * 60 * 1000).toISOString();
}

export function createCase({
  orgId,
  workerId = null,
  anonymous = false,
  type = 'grievance',
  category = '',
  text = '',
  lang = 'en',
  severity = 'medium',
  now = new Date(),
}) {
  const createdAt = new Date(now).toISOString();
  return {
    id: `c_${Math.random().toString(36).slice(2, 9)}`,
    orgId,
    workerId: anonymous ? null : workerId,
    anonymous,
    type: CASE_TYPES.includes(type) ? type : 'grievance',
    category,
    text,
    lang,
    severity: SEVERITIES.includes(severity) ? severity : 'medium',
    status: 'open',
    createdAt,
    dueAt: dueAtFor(severity, createdAt),
    events: [{ at: createdAt, status: 'open', note: '' }],
  };
}

/** Resolved → resolved; otherwise overdue wins over the stored status. */
export function effectiveStatus(item, now = new Date()) {
  if (item.status === 'resolved') return 'resolved';
  if (new Date(item.dueAt).getTime() < new Date(now).getTime()) return 'overdue';
  return item.status;
}

export function hoursRemaining(item, now = new Date()) {
  const remaining = (new Date(item.dueAt).getTime() - new Date(now).getTime()) / 3600000;
  return Math.round(remaining * 10) / 10;
}

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

export function advance(item, to, note = '', now = new Date()) {
  if (!canTransition(item.status, to)) return item;
  item.status = to;
  item.events.push({ at: new Date(now).toISOString(), status: to, note });
  if (to === 'resolved') item.resolvedAt = new Date(now).toISOString();
  return item;
}

export function isOpenCase(item) {
  return item.status !== 'resolved';
}

export function summariseCases(items, now = new Date()) {
  const open = items.filter(isOpenCase);
  const overdue = open.filter((item) => effectiveStatus(item, now) === 'overdue');
  const resolved = items.filter((item) => item.status === 'resolved');
  const safety = open.filter((item) => item.type === 'safety');

  return {
    total: items.length,
    open: open.length,
    overdue: overdue.length,
    resolved: resolved.length,
    safetyOpen: safety.length,
  };
}
