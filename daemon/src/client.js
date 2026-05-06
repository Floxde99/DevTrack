class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.retryQueue = [];
  }

  async postEvent(event) {
    try {
      const res = await fetch(`${this.baseUrl}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[client] POST failed: ${msg} — queued for retry`);
      this.retryQueue.push(event);
      return false;
    }
  }

  async flushRetryQueue() {
    if (this.retryQueue.length === 0) return;
    const batch = [...this.retryQueue];
    this.retryQueue = [];

    for (const event of batch) {
      const ok = await this.postEvent(event);
      if (!ok) break;
    }
  }
}

module.exports = { ApiClient };

