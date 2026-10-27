import { generate, parseJson } from './gemini.js';

/**
 * Local classifier. This is the source of truth whenever Gemini is unavailable
 * (no key, quota exhausted, slow network) and the baseline that AI output is
 * validated against, so a hallucinated theme can never reach the dashboard.
 */
const THEME_RULES = [
  { theme: 'harassment', keywords: ['harass', 'abuse', 'shout', 'threat', 'उत्पीड़न', 'துன்புறுத்தல்'] },
  { theme: 'safety', keywords: ['safety', 'helmet', 'scaffold', 'hazard', 'accident', 'injur', 'fire', 'shock', 'fumes', 'सुरक्षा', 'பாதுகாப்பு', 'விபத்து'] },
  { theme: 'transport', keywords: ['transport', 'bus', 'travel', 'commute', 'drop', 'छोड़', 'பேருந்து'] },
  { theme: 'wage transparency', keywords: ['wage', 'salary', 'pay', 'overtime', 'register', 'payslip', 'वेतन', 'ओवरटाइम', 'சம்பளம்', 'கூடுதல்'] },
  { theme: 'scheduling', keywords: ['shift', 'timetable', 'roster', 'schedule', 'night', 'शिफ्ट', 'समय', 'நேரம்', 'அட்டவணை'] },
  { theme: 'inclusion', keywords: ['meeting', 'contract', 'guest', 'included', 'renewal', 'बैठक', 'अनुबंध', 'ஒப்பந்த'] },
  { theme: 'facilities', keywords: ['water', 'cooler', 'toilet', 'lab', 'equipment', 'room', 'maintenance', 'पानी', 'शौचालय', 'தண்ணீர்', 'கழிப்பறை'] },
  { theme: 'working conditions', keywords: ['break', 'heat', 'rest', 'crowd', 'आराम', 'गर्मी', 'ஓய்வு', 'வெப்பம்'] },
];

const NEGATIVE = ['not', 'no', 'never', 'broke', 'broken', 'unsafe', 'late', 'delay', 'slow', 'complain', 'worst', 'unfair', 'ran out', 'नहीं', 'नहीं है', 'இல்லை', 'மோசம்'];
const POSITIVE = ['good', 'thanks', 'better', 'helpful', 'safe', 'fair', 'clear', 'अच्छा', 'நல்ல', 'நன்றி'];
const SEVERE = ['fell', 'fire', 'shock', 'injur', 'harass', 'collapsed', 'hospital', 'गिर', 'आग', 'विफल', 'தீ', 'விபத்து'];

const has = (text, words) => words.some((word) => text.includes(word));

export function classifyLocal(text) {
  const haystack = String(text || '').toLowerCase();

  const theme = THEME_RULES.find((rule) => has(haystack, rule.keywords))?.theme || 'other';
  const negative = has(haystack, NEGATIVE);
  const positive = has(haystack, POSITIVE) && !negative;
  const sentiment = positive ? 'positive' : negative ? 'negative' : 'neutral';
  const severity = has(haystack, SEVERE) ? 'high' : theme === 'safety' || theme === 'harassment' ? 'medium' : 'low';

  return { theme, sentiment, severity };
}

const VALID_SENTIMENTS = new Set(['positive', 'neutral', 'negative']);
const VALID_SEVERITIES = new Set(['low', 'medium', 'high']);
const KNOWN_THEMES = new Set([...THEME_RULES.map((rule) => rule.theme), 'other']);

/**
 * Theme + sentiment for a piece of feedback or a complaint.
 * Gemini improves the wording of the theme; its answer is only accepted when it
 * parses and lands inside the known vocabulary.
 */
export async function analyseText(text, { lang = 'en' } = {}) {
  const local = classifyLocal(text);

  const prompt = [
    'You classify workplace feedback for a fair-work platform.',
    `The message is written in ${lang === 'hi' ? 'Hindi' : lang === 'ta' ? 'Tamil' : 'English'}.`,
    'Return ONLY JSON with keys: theme (2-3 words, lowercase), sentiment (positive|neutral|negative), severity (low|medium|high).',
    'Severity is high only when there is a risk of injury or harm.',
    '',
    `Message: ${JSON.stringify(String(text).slice(0, 800))}`,
  ].join('\n');

  const parsed = parseJson(await generate(prompt, { maxOutputTokens: 120 }));
  if (!parsed) return { ...local, source: 'local' };

  const theme = String(parsed.theme || '').toLowerCase().trim();
  const sentiment = String(parsed.sentiment || '').toLowerCase().trim();
  const severity = String(parsed.severity || '').toLowerCase().trim();

  return {
    theme: KNOWN_THEMES.has(theme) ? theme : theme || local.theme,
    sentiment: VALID_SENTIMENTS.has(sentiment) ? sentiment : local.sentiment,
    severity: VALID_SEVERITIES.has(severity) ? severity : local.severity,
    source: 'ai',
  };
}

/** English rendering for a manager, while the worker keeps their own language. */
export async function translateToEnglish(text, lang = 'auto') {
  if (lang === 'en') return null;
  const prompt = [
    'Translate the following workplace message into English.',
    'Keep it factual and brief. Return only the translation, no commentary.',
    '',
    String(text).slice(0, 1200),
  ].join('\n');
  return generate(prompt, { maxOutputTokens: 400 });
}

/** Deterministic aggregation, so the dashboard is stable between refreshes. */
export function themeBreakdown(items) {
  const counts = new Map();
  for (const item of items) {
    const key = item.theme || 'other';
    const entry = counts.get(key) || { theme: key, total: 0, negative: 0, positive: 0 };
    entry.total += 1;
    if (item.sentiment === 'negative') entry.negative += 1;
    if (item.sentiment === 'positive') entry.positive += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.total - a.total || a.theme.localeCompare(b.theme));
}
