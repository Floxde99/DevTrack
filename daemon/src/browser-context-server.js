const http = require('node:http');
const { URL } = require('node:url');

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(data);
}

async function readJson(req) {
  return await new Promise((resolve, reject) => {
    let buf = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      buf += chunk;
      if (buf.length > 1_000_000) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function toDomain(maybeUrlOrDomain) {
  if (typeof maybeUrlOrDomain !== 'string') return '';
  const s = maybeUrlOrDomain.trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    return u.hostname || '';
  } catch {
    // already a domain
    return s;
  }
}

function createBrowserContextServer({
  host = '127.0.0.1',
  port,
  allowFullUrl = false,
  onContext,
}) {
  if (!Number.isFinite(port)) throw new Error('port required');

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return json(res, 200, { ok: true });

      const u = new URL(req.url ?? '/', `http://${host}:${port}`);
      if (req.method !== 'POST' || u.pathname !== '/browser/context') {
        return json(res, 404, { error: 'not found' });
      }

      const body = await readJson(req);
      const domain = toDomain(body.domain ?? body.url ?? '');
      if (!domain) return json(res, 400, { error: 'domain required' });

      const ctx = {
        domain,
        url: allowFullUrl && typeof body.url === 'string' ? body.url : null,
        title: typeof body.title === 'string' ? body.title : null,
        received_at: new Date().toISOString(),
      };

      if (typeof onContext === 'function') onContext(ctx);
      return json(res, 200, { ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return json(res, 400, { error: msg });
    }
  });

  server.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`[devtrack daemon] browser context listening on http://${host}:${port}/browser/context`);
  });

  return server;
}

module.exports = { createBrowserContextServer };

