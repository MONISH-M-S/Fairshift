import test from 'node:test';
import assert from 'node:assert/strict';

import { t, missingKeys, formatHours } from '../src/domain/i18n/index.js';

test('t interpolates {variable} templates', () => {
  const result = t('en', 'worker.capHint', { cap: 48 });
  assert.equal(result, 'Capped at 48h regular per week');
});

test('t falls back to English when key missing in locale', () => {
  const fallback = t('ta', 'non.existent.key');
  assert.equal(fallback, 'non.existent.key');
});

test('dictionaries have zero missing keys between en and other locales', () => {
  const missingHi = missingKeys('hi');
  const missingTa = missingKeys('ta');

  assert.deepEqual(missingHi, [], `Hindi is missing keys: ${missingHi.join(', ')}`);
  assert.deepEqual(missingTa, [], `Tamil is missing keys: ${missingTa.join(', ')}`);
});

test('formatHours formats hours and minutes properly', () => {
  assert.equal(formatHours(90), '1h 30m');
  assert.equal(formatHours(60), '1h');
  assert.equal(formatHours(45), '45m');
});
