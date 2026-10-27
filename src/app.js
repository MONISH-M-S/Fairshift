import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AI_ENABLED,
  DEFAULT_LOCALE,
  IS_PROD,
  LOCALE_NAMES,
  LOCALES,
  SESSION_SECRET,
} from './config.js';
import { translator } from './domain/i18n/index.js';
import { formatDuration } from './domain/shifts.js';
import { requireSameOrigin, sessionMiddleware } from './middleware/session.js';
import { seed } from './seed.js';
import authRoutes from './routes/auth.js';
import workerRoutes from './routes/worker.js';
import employerRoutes from './routes/employer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

if (IS_PROD && !SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production.');
}

seed();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(root, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(express.json({ limit: '32kb' }));

app.use(
  express.static(path.join(root, 'public'), {
    maxAge: IS_PROD ? '7d' : 0,
    etag: true,
  })
);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self'",
      "script-src 'self'",
      "connect-src 'self'",
      "media-src 'self' blob:",
      "form-action 'self'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  next();
});

app.use(sessionMiddleware);
app.use(requireSameOrigin);

/** Language negotiation: ?lang= then cookie then Accept-Language. */
app.use((req, res, next) => {
  const fromQuery = String(req.query.lang || '');
  const fromCookie = String(
    (req.headers.cookie || '').match(/(?:^|;\s*)fs_lang=([a-z]{2})/)?.[1] || ''
  );
  const fromHeader = String(req.headers['accept-language'] || '')
    .split(',')
    .map((part) => part.split(';')[0].trim().slice(0, 2));

  req.locale =
    [fromQuery, fromCookie, ...fromHeader].find((code) => LOCALES.includes(code)) || DEFAULT_LOCALE;

  if (fromQuery && LOCALES.includes(fromQuery)) {
    res.cookie('fs_lang', fromQuery, { sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 180 });
  }

  res.locals.locale = req.locale;
  res.locals.t = translator(req.locale);
  res.locals.locales = LOCALES;
  res.locals.localeNames = LOCALE_NAMES;
  res.locals.path = req.path;
  res.locals.aiEnabled = AI_ENABLED;
  res.locals.fmtDuration = formatDuration;
  res.locals.fmtMoney = (value) =>
    `₹${Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  next();
});

app.get('/healthz', (req, res) => {
  res.json({ ok: true, service: 'fairshift', locale: req.locale });
});

app.get('/lang/:code', (req, res) => {
  const code = String(req.params.code || '');
  if (LOCALES.includes(code)) {
    res.cookie('fs_lang', code, { sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 180 });
  }
  const next = String(req.query.next || '/');
  res.redirect(next.startsWith('/') ? next : '/');
});

app.get('/', (req, res) => {
  res.render('landing', { title: 'FairShift' });
});

app.use(authRoutes);
app.use(workerRoutes);
app.use(employerRoutes);

app.use((req, res) => {
  res.status(404).render('not-found', { title: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err?.message);
  res.status(500).render('error', { title: 'Something went wrong' });
});

export default app;
