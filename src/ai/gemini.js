import {
  AI_ENABLED,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
} from '../config.js';

export const aiAvailable = () => Boolean(AI_ENABLED && GEMINI_API_KEY);

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/**
 * Minimal Gemini client: one fetch, a hard timeout, and `null` on any failure.
 *
 * Returning null (rather than throwing) is deliberate. Every caller has a local
 * fallback, so a quota error degrades the feature instead of breaking a shift
 * report or a safety complaint at exactly the moment it matters.
 */
export async function generate(prompt, options = {}) {
  if (!aiAvailable()) return null;

  const {
    model = GEMINI_MODEL,
    timeoutMs = GEMINI_TIMEOUT_MS,
    temperature = 0.2,
    maxOutputTokens = 512,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(ENDPOINT(model), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`Gemini returned ${response.status}; using local fallback`);
      return null;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((part) => part.text || '').join('').trim();
    return text || null;
  } catch (error) {
    console.warn(`Gemini call failed (${error.name}); using local fallback`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function parseJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}
