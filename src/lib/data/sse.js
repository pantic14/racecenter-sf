// @ts-check
import { normalizeTelemetry } from './tick.js';

/** @type {{close: () => void} | null} */
let current = null;

const STALE_AFTER_MS = 20_000;
const RETRY_MIN_MS = 2_000;
const RETRY_MAX_MS = 30_000;

/**
 * Singleton live source: creating a new one always closes the previous,
 * so duplicate connections can never stack up.
 *
 * Status values: 'connecting' | 'live' | 'stale' | 'reconnecting'.
 * 'stale' is not an error: outside race hours the stream is open but silent.
 *
 * The stream is a firehose of every channel the site has (video, social, rankings, the
 * publicity caravan…). We read two: the telemetry `bind`, and — when asked — the stage's
 * `checkpointBind`, which re-sends the whole checkpoint payload each time ASO refreshes the
 * roadside weather, every 30 min or so. That makes live weather a subscription rather than
 * a poll: no extra request, and no timer of ours to get wrong.
 *
 * @param {{
 *   url: string,
 *   bind: string,
 *   checkpointBind?: string|null,
 *   onTick: (tick: import('./tick.js').Tick) => void,
 *   onCheckpoints?: (payload: any) => void,
 *   onStatus: (status: string) => void,
 *   onRaw?: (data: string) => void,
 *   EventSourceImpl?: typeof EventSource,
 * }} opts
 */
export function createLiveSource({ url, bind, checkpointBind, onTick, onCheckpoints, onStatus, onRaw, EventSourceImpl = EventSource }) {
  current?.close();

  /** @type {EventSource|null} */
  let es = null;
  let closed = false;
  let retryDelay = RETRY_MIN_MS;
  let retryTimer = 0;
  let lastEventAt = 0;

  const watchdog = setInterval(() => {
    if (lastEventAt && Date.now() - lastEventAt > STALE_AFTER_MS) onStatus('stale');
  }, 5_000);

  function connect() {
    onStatus('connecting');
    es = new EventSourceImpl(url);
    es.onopen = () => {
      retryDelay = RETRY_MIN_MS;
      lastEventAt = Date.now(); // arms the staleness watchdog even if no update ever arrives
    };
    es.addEventListener('update', (e) => {
      lastEventAt = Date.now();
      const raw = /** @type {MessageEvent} */ (e).data;
      onRaw?.(raw);
      let d;
      try {
        d = JSON.parse(raw);
      } catch {
        return;
      }
      if (checkpointBind && d.bind === checkpointBind && d.data) {
        onCheckpoints?.(d.data);
        return;
      }
      if (d.bind !== bind) return;
      const tick = normalizeTelemetry(d);
      if (tick) {
        onStatus('live');
        onTick(tick);
      }
    });
    es.onerror = () => {
      if (closed) return;
      onStatus('reconnecting');
      // EventSource retries transient errors itself; only a CLOSED source needs rebuilding
      if (es && es.readyState === 2) {
        es.close();
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
      }
    };
  }
  connect();

  const handle = {
    close() {
      closed = true;
      clearInterval(watchdog);
      clearTimeout(retryTimer);
      es?.close();
      if (current === handle) current = null;
    },
  };
  current = handle;
  return handle;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => current?.close());
}
