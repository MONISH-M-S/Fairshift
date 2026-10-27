import app from '../src/app.js';

/**
 * Serverless entry point.
 *
 * Two platform quirks are handled here so the Express application itself stays
 * portable:
 *
 * 1. The runtime pre-parses request bodies and hands them over as `req.body`.
 *    Express's body-parser would then try to read an already-drained stream, so
 *    we flag the body as parsed and let Express reuse it.
 * 2. Every path is rewritten to this function. The rewrite forwards the
 *    original path in the `__path` query parameter, which we restore before
 *    handing the request to the router.
 */
export default function handler(req, res) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req._body = true;
  }

  const url = new URL(req.url, 'http://internal');
  const original = url.searchParams.get('__path');
  if (original !== null) {
    url.searchParams.delete('__path');
    const query = url.searchParams.toString();
    const path = `/${original.replace(/^\/+/, '')}`;
    req.url = query ? `${path}?${query}` : path;
  }

  return app(req, res);
}
