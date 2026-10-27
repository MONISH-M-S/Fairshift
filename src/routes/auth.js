import express from 'express';

import { DEMO_PERSONAS } from '../seed.js';
import { byId } from '../store.js';
import { LOCALE_NAMES, LOCALES } from '../config.js';

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session) {
    return res.redirect(req.session.role === 'admin' ? '/admin' : '/w');
  }
  res.render('login', {
    title: 'Sign in',
    personas: DEMO_PERSONAS,
    locales: LOCALES,
    localeNames: LOCALE_NAMES,
  });
});

/**
 * Demo sign-in: pick a persona. Real deployments replace this with an identity
 * provider; the session layer below it does not change.
 */
router.post('/login', (req, res) => {
  const persona = DEMO_PERSONAS.find((item) => item.id === String(req.body.persona || ''));
  if (!persona) return res.status(400).render('error', { title: 'Unknown sign-in' });

  const record = byId('workers', persona.id);
  if (!record) return res.status(400).render('error', { title: 'Unknown sign-in' });

  res.setSession({
    role: persona.role,
    workerId: record.id,
    orgId: record.orgId,
    issuedAt: Date.now(),
  });

  const preferred = record.language;
  if (LOCALES.includes(preferred) && !req.query.lang) {
    res.cookie('fs_lang', preferred, { sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 180 });
  }

  res.redirect(persona.role === 'admin' ? '/admin' : '/w');
});

router.post('/logout', (req, res) => {
  res.clearSession();
  res.redirect('/login');
});

export default router;
