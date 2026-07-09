// @ts-check
import { normalizeTelemetry } from './tick.js';
import { openDb, reqDone } from '../storage/db.js';

/**
 * @typedef {Object} IndexEntry
 * @property {string} id
 * @property {string} date
 * @property {string} name
 * @property {number|null} km
 * @property {number} ticks
 * @property {number} t0
 * @property {number} t1
 * @property {number} bytes
 * @property {string} file
 */

/**
 * @typedef {Object} ReplayTick
 * @property {number} dt  ms to wait after the PREVIOUS replay tick (0 on the first)
 * @property {number} timeStamp
 * @property {import('./tick.js').RiderTick[]} riders
 */

/**
 * Turn a recording's raw event stream into normalized telemetry ticks only.
 * Non-telemetry events are dropped, but their `dt` is rolled into the next kept
 * tick so replay timing stays faithful. Pure — safe to unit-test in node.
 * @param {{dt:number, data:string}[]} events
 * @param {string} [bind]  telemetry bind to keep; if omitted, any Riders[] payload counts
 * @returns {ReplayTick[]}
 */
export function extractTicks(events, bind) {
  /** @type {ReplayTick[]} */
  const ticks = [];
  let acc = 0;
  for (const ev of events) {
    acc += ev.dt || 0;
    let d;
    try {
      d = JSON.parse(ev.data);
    } catch {
      continue;
    }
    if (bind && d?.bind !== bind) continue;
    const tick = normalizeTelemetry(d);
    if (!tick) continue;
    ticks.push({ dt: acc, timeStamp: tick.timeStamp, riders: tick.riders });
    acc = 0;
  }
  return ticks;
}

/** GET the manifest of available recordings. @param {string} baseUrl @returns {Promise<IndexEntry[]>} */
export async function fetchIndex(baseUrl) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/index.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`index.json -> HTTP ${res.status}`);
  const list = await res.json();
  if (!Array.isArray(list)) throw new Error('index.json is not an array');
  return list;
}

/**
 * Decompress a gzipped recording Blob and extract its ticks + REST snapshot.
 * @param {Blob} blob
 * @returns {Promise<{ticks: ReplayTick[], rest: any, meta: any}>}
 */
export async function parseRecording(blob) {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(stream).text();
  const rec = JSON.parse(text);
  const bind = rec?.meta?.year ? `telemetryCompetitor-${rec.meta.year}` : undefined;
  return { ticks: extractTicks(rec.events ?? [], bind), rest: rec.rest ?? {}, meta: rec.meta ?? {} };
}

/**
 * Get a recording as a gz Blob — from the IndexedDB cache if present, else
 * download it (reporting progress) and cache it. Then decompress + extract.
 * @param {string} baseUrl
 * @param {IndexEntry} entry
 * @param {(received: number, total: number) => void} [onProgress]
 * @returns {Promise<{ticks: ReplayTick[], rest: any, meta: any}>}
 */
export async function fetchRecording(baseUrl, entry, onProgress) {
  let blob = await getCached(entry.id);
  if (!blob) {
    blob = await download(`${baseUrl.replace(/\/$/, '')}/${entry.file}`, entry.bytes, onProgress);
    await putCached(entry, blob);
  } else {
    onProgress?.(entry.bytes, entry.bytes);
  }
  return parseRecording(blob);
}

/**
 * Stream a URL into a Blob, reporting received/total bytes as it goes.
 * @param {string} url @param {number} total @param {(r:number,t:number)=>void} [onProgress]
 */
async function download(url, total, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const len = Number(res.headers.get('content-length')) || total || 0;
  if (!res.body) return res.blob(); // no streaming available; fall back
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(received, len);
  }
  return new Blob(chunks, { type: 'application/gzip' });
}

// ---- recordings cache (IndexedDB store 'recordings', keyPath 'id') ----

/** @param {string} id @returns {Promise<Blob|null>} */
export async function getCached(id) {
  const d = await openDb();
  const row = await reqDone(d.transaction('recordings').objectStore('recordings').get(id));
  return row?.blob ?? null;
}

/** @param {IndexEntry} entry @param {Blob} blob */
export async function putCached(entry, blob) {
  const d = await openDb();
  const tx = d.transaction('recordings', 'readwrite');
  tx.objectStore('recordings').put({ id: entry.id, blob, entry, cachedAt: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(undefined);
    tx.onerror = () => reject(tx.error);
  });
}

/** @returns {Promise<{id:string, bytes:number, entry:IndexEntry, cachedAt:number}[]>} list cached recordings (no blobs) */
export async function listCached() {
  const d = await openDb();
  const rows = await reqDone(d.transaction('recordings').objectStore('recordings').getAll());
  return rows.map((r) => ({ id: r.id, bytes: r.blob?.size ?? r.entry?.bytes ?? 0, entry: r.entry, cachedAt: r.cachedAt }));
}

/** @param {string} id */
export async function deleteCached(id) {
  const d = await openDb();
  const tx = d.transaction('recordings', 'readwrite');
  tx.objectStore('recordings').delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(undefined);
    tx.onerror = () => reject(tx.error);
  });
}
