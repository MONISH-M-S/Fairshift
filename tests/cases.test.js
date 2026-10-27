import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCase,
  dueAtFor,
  effectiveStatus,
  hoursRemaining,
  canTransition,
  advance,
  summariseCases,
} from '../src/domain/cases.js';

test('dueAtFor assigns 24h for high severity and 48h for medium', () => {
  const base = '2026-10-20T10:00:00.000Z';
  const highDue = dueAtFor('high', base);
  const medDue = dueAtFor('medium', base);

  const diffHigh = (new Date(highDue).getTime() - new Date(base).getTime()) / 3600000;
  const diffMed = (new Date(medDue).getTime() - new Date(base).getTime()) / 3600000;

  assert.equal(diffHigh, 24);
  assert.equal(diffMed, 48);
});

test('createCase initializes status to open and records first event', () => {
  const item = createCase({
    orgId: 'org1',
    workerId: 'w1',
    type: 'safety',
    category: 'Scaffolding',
    text: 'Scaffolding unstable on 4th floor',
    severity: 'high',
  });

  assert.equal(item.status, 'open');
  assert.equal(item.type, 'safety');
  assert.equal(item.events.length, 1);
  assert.equal(item.events[0].status, 'open');
});

test('effectiveStatus transitions to overdue when now is past dueAt', () => {
  const pastDue = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const item = { status: 'open', dueAt: pastDue };

  assert.equal(effectiveStatus(item), 'overdue');

  // Resolved status is never overdue
  const resolved = { status: 'resolved', dueAt: pastDue };
  assert.equal(effectiveStatus(resolved), 'resolved');
});

test('advance moves case from open to acknowledged to resolved', () => {
  const item = createCase({ orgId: 'org1', text: 'Test' });

  assert.ok(canTransition('open', 'acknowledged'));
  assert.ok(canTransition('acknowledged', 'resolved'));
  assert.ok(!canTransition('resolved', 'open'));

  advance(item, 'acknowledged', 'Manager checking site');
  assert.equal(item.status, 'acknowledged');
  assert.equal(item.events.length, 2);

  advance(item, 'resolved', 'Fixed and cleared');
  assert.equal(item.status, 'resolved');
  assert.ok(item.resolvedAt);
});

test('summariseCases aggregates counts correctly', () => {
  const items = [
    { status: 'open', dueAt: new Date(Date.now() + 100000).toISOString(), type: 'safety' },
    { status: 'open', dueAt: new Date(Date.now() - 100000).toISOString(), type: 'grievance' }, // overdue
    { status: 'resolved', dueAt: new Date(Date.now() - 200000).toISOString(), type: 'safety' },
  ];

  const summary = summariseCases(items);
  assert.equal(summary.total, 3);
  assert.equal(summary.open, 2);
  assert.equal(summary.overdue, 1);
  assert.equal(summary.resolved, 1);
  assert.equal(summary.safetyOpen, 1);
});
