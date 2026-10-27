import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';

import app from '../src/app.js';

const SECRET = 'fairshift-local-development-secret';
function sessionCookie(session) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `fairshift_sid=${payload}.${signature}`;
}

function executeRoute(url, cookie = '') {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage();
    req.method = 'GET';
    req.url = url;
    req.headers = {
      host: 'localhost',
      cookie,
      'accept-language': 'en',
    };
    req.connection = { remoteAddress: '127.0.0.1' };
    req.socket = req.connection;

    const res = new http.ServerResponse(req);
    let body = '';

    res.write = (chunk) => {
      body += chunk ? chunk.toString() : '';
      return true;
    };

    res.end = (chunk) => {
      if (chunk) body += chunk.toString();
      resolve({ statusCode: res.statusCode, body, headers: res.getHeaders() });
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ statusCode: 404, body: 'Not Found' });
    });
  });
}

test('GET / renders landing page with 200', async () => {
  const res = await executeRoute('/');
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.includes('FairShift'));
  assert.ok(res.body.includes('SDG 8'));
});

test('GET /healthz returns ok status', async () => {
  const res = await executeRoute('/healthz');
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.includes('"ok":true'));
});

test('GET /login renders sign-in page with 4 personas', async () => {
  const res = await executeRoute('/login');
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.includes('Priya'));
  assert.ok(res.body.includes('Ravi'));
  assert.ok(res.body.includes('Arjun'));
  assert.ok(res.body.includes('Lakshmi'));
});

test('Worker routes render successfully for worker session', async () => {
  const cookie = sessionCookie({ role: 'worker', workerId: 'w_priya', orgId: 'org_construction' });

  for (const path of ['/w', '/w/checkin', '/w/payslip', '/w/report', '/w/feedback', '/w/skills']) {
    const res = await executeRoute(path, cookie);
    assert.equal(res.statusCode, 200, `Expected 200 for ${path}, got ${res.statusCode}`);
    assert.ok(res.body.includes('FairShift'), `Expected body content for ${path}`);
  }
});

test('Employer routes render successfully for construction admin session', async () => {
  const cookie = sessionCookie({ role: 'admin', workerId: 'a_ravi', orgId: 'org_construction' });

  for (const path of ['/admin', '/admin/cases', '/admin/workers/w_priya']) {
    const res = await executeRoute(path, cookie);
    assert.equal(res.statusCode, 200, `Expected 200 for ${path}, got ${res.statusCode}`);
    assert.ok(res.body.includes('FairShift'), `Expected body content for ${path}`);
  }
});

test('Employer routes render successfully for college admin session', async () => {
  const cookie = sessionCookie({ role: 'admin', workerId: 'a_lakshmi', orgId: 'org_college' });

  for (const path of ['/admin', '/admin/cases', '/admin/workers/w_arjun']) {
    const res = await executeRoute(path, cookie);
    assert.equal(res.statusCode, 200, `Expected 200 for ${path}, got ${res.statusCode}`);
    assert.ok(res.body.includes('FairShift'), `Expected body content for ${path}`);
  }
});

test('Hospital industry routes render successfully for hospital admin and nurse', async () => {
  const adminCookie = sessionCookie({ role: 'admin', workerId: 'a_anand', orgId: 'org_hospital' });
  for (const path of ['/admin', '/admin/cases', '/admin/workers/w_kavitha']) {
    const res = await executeRoute(path, adminCookie);
    assert.equal(res.statusCode, 200, `Expected 200 for ${path}, got ${res.statusCode}`);
    assert.ok(res.body.includes('FairShift'));
  }

  const nurseCookie = sessionCookie({ role: 'worker', workerId: 'w_kavitha', orgId: 'org_hospital' });
  const workerRes = await executeRoute('/w', nurseCookie);
  assert.equal(workerRes.statusCode, 200);
  assert.ok(workerRes.body.includes('Kavitha'));
});
