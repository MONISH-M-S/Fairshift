const bool = (value, fallback = false) =>
  value === undefined ? fallback : ['1', 'true', 'yes'].includes(String(value).toLowerCase());

export const PORT = Number(process.env.PORT || 8080);
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PROD = NODE_ENV === 'production';

/**
 * Session signing key. A development fallback keeps local runs frictionless,
 * but production refuses to boot without a real secret (see app.js).
 */
export const SESSION_SECRET = process.env.SESSION_SECRET || '';
export const SESSION_COOKIE = 'fairshift_sid';
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;

/** Gemini is optional: every AI feature degrades to a local heuristic. */
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 8000);
export const AI_ENABLED = bool(process.env.AI_ENABLED, Boolean(GEMINI_API_KEY));

export const LOCALES = ['en', 'hi', 'ta'];
export const DEFAULT_LOCALE = 'en';
export const LOCALE_NAMES = { en: 'English', hi: 'हिंदी', ta: 'தமிழ்' };

/**
 * Industry presets. The same application serves both: only rules and label
 * vocabulary change, which is what makes the two-industry requirement real
 * rather than a mock-up.
 */
export const INDUSTRIES = {
  construction: {
    id: 'construction',
    name: { en: 'Construction Site', hi: 'निर्माण साइट', ta: 'கட்டுமான தளம்' },
    workerLabel: { en: 'Worker', hi: 'कर्मचारी', ta: 'பணியாளர்' },
    siteLabel: { en: 'Site', hi: 'साइट', ta: 'தளம்' },
    dailyThresholdMinutes: 480,
    overtimeMultiplier: 1.5,
    weeklyHourCap: 48,
    minRestGapHours: 11,
    maxConsecutiveDays: 6,
    hazards: ['Scaffolding', 'Electrical', 'Heat / Sun', 'Machinery', 'Falling objects', 'Chemical'],
    deductions: [],
  },
  college: {
    id: 'college',
    name: { en: 'College', hi: 'कॉलेज', ta: 'கல்லூரி' },
    workerLabel: { en: 'Staff', hi: 'कर्मचारी', ta: 'பணியாளர்' },
    siteLabel: { en: 'Campus', hi: 'परिसर', ta: 'வளாகம்' },
    dailyThresholdMinutes: 480,
    overtimeMultiplier: 1.25,
    weeklyHourCap: 40,
    minRestGapHours: 10,
    maxConsecutiveDays: 6,
    hazards: ['Laboratory safety', 'Harassment', 'Fire exit blocked', 'Electrical', 'Ergonomics'],
    deductions: [{ key: 'pf', label: 'Provident fund', percent: 12 }],
  },
  hospital: {
    id: 'hospital',
    name: { en: 'Hospital', hi: 'अस्पताल', ta: 'மருத்துவமனை' },
    workerLabel: { en: 'Nurse / Staff', hi: 'नर्स / कर्मचारी', ta: 'செவிலியர் / ஊழியர்' },
    siteLabel: { en: 'Ward / Campus', hi: 'वार्ड / परिसर', ta: 'வார்டு / வளாகம்' },
    dailyThresholdMinutes: 480,
    overtimeMultiplier: 1.5,
    weeklyHourCap: 44,
    minRestGapHours: 12,
    maxConsecutiveDays: 5,
    hazards: ['Needle-stick / Sharps', 'Biohazard / Infection', 'Radiation exposure', 'Physical assault', 'Chemical sterilants'],
    deductions: [
      { key: 'pf', label: 'Provident fund', percent: 12 },
      { key: 'esi', label: 'ESI Medical Cover', percent: 1.75 },
    ],
  },
};

export const DEFAULT_INDUSTRY = 'construction';

export function industryOf(id) {
  return INDUSTRIES[id] || INDUSTRIES[DEFAULT_INDUSTRY];
}
