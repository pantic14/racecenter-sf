// @ts-check

/**
 * Load a fixture and return a class with the EventSource interface that
 * replays it, so sse.js works identically in mock and live mode.
 *
 * Fixture format: [{ dt: msSinceLastEvent, data: "<verbatim SSE data string>" }]
 * The replay loops forever (handy while developing).
 *
 * @param {string} fixtureName  file name without extension under fixtures/
 * @param {number} speed  time multiplier (e.g. 10 = ten times faster)
 * @returns {Promise<typeof EventSource>}
 */
export async function loadMockEventSource(fixtureName, speed = 1) {
  const res = await fetch(`fixtures/${fixtureName}.json`);
  if (!res.ok) throw new Error(`fixture '${fixtureName}' not found (HTTP ${res.status})`);
  /** @type {{dt: number, data: string}[]} */
  const events = await res.json();
  if (!events.length) throw new Error(`fixture '${fixtureName}' is empty`);

  // @ts-expect-error - duck-typed EventSource replacement
  return class MockEventSource {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 2;

    constructor() {
      this.readyState = 1;
      /** @type {Map<string, ((e: {data: string}) => void)[]>} */
      this._listeners = new Map();
      this.onopen = null;
      this.onerror = null;
      this._timer = 0;
      setTimeout(() => this.onopen?.(new Event('open')), 0);
      this._schedule(0);
    }

    addEventListener(type, fn) {
      const list = this._listeners.get(type) ?? [];
      list.push(fn);
      this._listeners.set(type, list);
    }

    _schedule(i) {
      if (this.readyState === 2) return;
      if (i >= events.length) i = 0; // loop
      const ev = events[i];
      this._timer = setTimeout(() => {
        for (const fn of this._listeners.get('update') ?? []) fn({ data: ev.data });
        this._schedule(i + 1);
      }, Math.max(ev.dt / speed, 0));
    }

    close() {
      this.readyState = 2;
      clearTimeout(this._timer);
    }
  };
}
