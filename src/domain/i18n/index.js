import en from './en.js';
import hi from './hi.js';
import ta from './ta.js';

import { DEFAULT_LOCALE, LOCALES } from '../../config.js';

export const dictionaries = { en, hi, ta };

/**
 * Translate a key, with `{name}` style interpolation.
 * Falls back to English, then to the key itself so the UI never blanks out.
 */
export function t(locale, key, vars = {}) {
  const table = dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
  const template = table[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;

  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  );
}

export function translator(locale) {
  return (key, vars) => t(locale, key, vars);
}

/** Keys missing from a locale — used by the i18n test to keep translations honest. */
export function missingKeys(locale) {
  const base = Object.keys(dictionaries[DEFAULT_LOCALE]);
  return base.filter((key) => !(key in dictionaries[locale]));
}

export function isLocale(value) {
  return LOCALES.includes(value);
}

/** Format hours as "7h 30m" in a locale-neutral way (digits are widely read). */
export function formatHours(minutes, labels = { hours: 'h', minutes: 'm' }) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}${labels.minutes}`;
  if (m === 0) return `${h}${labels.hours}`;
  return `${h}${labels.hours} ${m}${labels.minutes}`;
}
