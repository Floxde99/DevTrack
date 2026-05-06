const BASE = import.meta.env.VITE_API_URL || '';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let details = null;
    try {
      details = await res.clone().json();
    } catch {
      try {
        details = { error: await res.clone().text() };
      } catch {
        details = null;
      }
    }

    const msgFromBody =
      details && typeof details === 'object'
        ? details.error || details.message || (typeof details === 'string' ? details : null)
        : null;

    const msg = msgFromBody
      ? `${msgFromBody}`
      : `${method} ${path} failed (${res.status})`;

    const err = new Error(msg);
    err.status = res.status;
    err.details = details;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
};

