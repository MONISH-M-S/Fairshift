import crypto from 'node:crypto';

import { IS_PROD, SESSION_COOKIE, SESSION_MAX_AGE_MS, SESSION_SECRET } from '../config.js';

const SECRET = SESSION_SECRET || (IS_PROD ? '' : 'fairshift-local-development-secret');

if (!SECRET) {
  throw new Error('SESSION_SECRET must be set in production.');
}

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function encode(session) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decode(raw) {
  if (typeof raw !== 'string' || !raw.includes('.')) return null;
  const [payload, signature] = raw.split('.');
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session || typeof session !== 'object') return null;
    return session;
  } catch {
    return null;
  }
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

/** Attach `req.session` to every request. Unsigned or tampered cookies are ignored. */
export function sessionMiddleware(req, res, next) {
  const raw = readCookie(req.headers.cookie, SESSION_COOKIE);
  req.session = raw ? decode(raw) : null;
  res.locals.session = req.session;

  res.setSession = (session) => {
    res.cookie(SESSION_COOKIE, encode(session), {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD,
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });
    req.session = session;
    res.locals.session = session;
  };
  res.clearSession = () => {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    req.session = null;
    res.locals.session = null;
  };
  next();
}

export function requireWorker(req, res, next) {
  if (req.session?.role === 'worker' && req.session.workerId) return next();
  res.redirect('/login');
}

export function requireAdmin(req, res, next) {
  if (req.session?.role === 'admin' && req.session.orgId) return next();
  res.redirect('/login');
}

/** Reject cross-site form posts. SameSite=Lax already blocks most of this. */
export function requireSameOrigin(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const origin = req.headers.origin;
  if (!origin) return next(); // curl / same-origin form posts without Origin
  try {
    const host = new URL(origin).host;
    if (host === req.headers.host) return next();
  } catch {
    /* fall through */
  }
  res.status(403).json({ error: 'cross-origin request rejected' });
}
