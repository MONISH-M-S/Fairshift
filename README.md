# FairShift

**A decent-work platform for employee-intensive organisations — built for SDG 8.**

FairShift replaces the paper register, the wage spreadsheet and the WhatsApp complaint thread
with one shared record: attendance, pay, safety and skills, in the worker's own language, on a
basic phone.

- **Live demo:** https://fairshift-pi.vercel.app
- **Two interfaces:** worker (`/w`) and employer (`/admin`)
- **Three industries, one codebase:** construction, college, hospital
- **Three languages:** English, हिंदी, தமிழ்

---

## The problem

| For workers | For employers |
| --- | --- |
| Salary is a number with no explanation | No view of who is overworked |
| Overtime disappears from the register | Problems surface only once they are serious |
| Complaints risk being identified | Safety issues stay invisible until an injury |
| Skills vanish when the job changes | No record of who is about to leave |

## What it does

1. **Attendance & overtime** — check in with a site code; hours and overtime are calculated at
   check-out against the industry's own rules, not estimated at month end.
2. **Traceable payslips** — every rupee links back to the shifts that produced it; a worker can
   dispute a shift before payroll runs.
3. **Safety & grievance reporting** — text or voice, anonymous if needed, with a response
   deadline and a visible timeline per case.
4. **Anonymous feedback** — themes and sentiment are extracted so management sees the pattern,
   never the author.
5. **Skill passport** — certifications and experience stay with the worker across employers.
6. **Fatigue alerts** — flags excessive weekly hours, short rest gaps and long streaks before
   they become an injury or a resignation.
7. **Employer dashboard** — attendance trend, open and overdue cases, feedback themes, and a
   leave-risk score per worker.
8. **Emergency SOS** — one-tap escalation that opens a high-severity case with a 24-hour deadline.

## Industry rules are data, not branches

| | Construction | College | Hospital |
| --- | --- | --- | --- |
| Daily overtime threshold | 8 h | 8 h | 8 h |
| Overtime multiplier | 1.5× | 1.25× | 1.5× |
| Weekly hour cap | 48 | 40 | 44 |
| Minimum rest gap | 11 h | 10 h | 12 h |
| Statutory deductions | — | PF 12% | PF 12% + ESI 1.75% |

Adding an industry means adding one object to `src/config.js`.

## Run locally

```bash
npm install
npm start          # http://localhost:8080
npm test           # node:test, 29 tests, no network required
```

Demo sign-in is a persona picker (no passwords): Priya (construction worker), Arjun (college
staff), Kavitha (nurse), plus a supervisor, principal and medical superintendent.

Site codes for check-in: construction `4821`, college `7315`, hospital `9062`.

## Stack

- Node 20+ / Express 4 / EJS — server-rendered, no client framework, works without JavaScript
- Two production dependencies (`express`, `ejs`); tests use the built-in `node:test`
- In-memory store seeded on boot (`src/store.js`, `src/seed.js`) — swap for Firestore/Postgres
  behind the same accessors
- Gemini is optional: `src/ai/gemini.js` degrades to a local heuristic in `src/ai/themes.js`, so
  the app and the test suite run fully offline
- Deployed as a serverless function (`api/index.js` + `vercel.json`), also runnable as a
  container (`Dockerfile`)

## Configuration

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | HMAC key for the signed session cookie. **Required in production.** |
| `GEMINI_API_KEY` | Optional. Enables Gemini-backed theme/sentiment/severity analysis. |
| `AI_ENABLED` | Force AI on/off regardless of key presence. |
| `PORT` | HTTP port (default 8080). |

No secrets are committed to this repository.

## Accessibility & inclusion

- Semantic landmarks, skip link, visible focus, labelled form controls, `aria-live` notices
- Colour contrast checked against WCAG AA; layout holds at 320 px width
- Every core action works as a plain HTML form post — no JavaScript required
- Language switch persists via cookie and respects `Accept-Language`

## Known limits

This is a hackathon prototype. Sign-in is a persona picker, not authentication; data is held in
memory and resets on redeploy; there is no rate limiting or audit log. The session, payroll and
case layers are written so a real identity provider and database can replace the demo versions
without touching the routes.

## Tests

```
tests/shifts.test.js    worked minutes, overtime split, rest gaps, streaks
tests/payroll.test.js   per-industry multipliers, deductions, disputed shifts
tests/fatigue.test.js   weekly-hour and rest-gap risk scoring
tests/cases.test.js     deadlines, status transitions, aggregation
tests/i18n.test.js      interpolation, fallback, dictionary parity
tests/routes.test.js    every route renders for every persona and industry
```

Built for **Prompt Wars 2026** · SRM ACM Student Chapter.
