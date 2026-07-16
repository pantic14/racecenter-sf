// @ts-check
import { checkpointList } from './climbs.js';

/**
 * @typedef {Object} WeatherPoint
 * @property {string} id
 * @property {string} place        as ASO writes it ('SAINT-POURÇAIN-SUR-SIOULE')
 * @property {number} kmFromStart
 * @property {number} kmToGo
 * @property {string} code         ASO's OpenWeatherMap icon code ('10d')
 * @property {string} emoji
 * @property {string} desc         ASO's own words, in French ('pluie modérée')
 * @property {boolean} isWet       rain, storm or snow — the reason this exists
 * @property {number|null} tempC
 * @property {number|null} windForce
 * @property {string} windDir      compass point ('NNE')
 * @property {number} meteoAt      ms — when the reading was taken
 * @property {number|null} dueAt   ms — roadbook's expected pass time
 * @property {boolean} stale       reading postdates the race passing (see below)
 */

/**
 * OpenWeatherMap icon families. ASO publishes the code alongside a French description; the
 * code is what we key on, so nothing depends on parsing their prose.
 */
const EMOJI = {
  '01': '☀️', // clear
  '02': '🌤️', // few clouds
  '03': '⛅', // scattered
  '04': '☁️', // broken / overcast
  '09': '🌧️', // shower
  '10': '🌦️', // rain
  '11': '⛈️', // thunderstorm
  '13': '🌨️', // snow
  '50': '🌫️', // mist
};
/** Families that mean water on the road. */
const WET = new Set(['09', '10', '11', '13']);

/**
 * How far a reading may postdate the roadbook's expected pass before it stops describing
 * the race. ASO refreshes each point every 30 min while it is still ahead of the riders and
 * leaves it alone once they are past, so a faithful reading lands within half an hour BEFORE
 * the pass. The finish is the exception: it is never "passed", so it keeps refreshing for
 * hours after the winner crosses (Nevers, 2026-07-15: read at 19:30 for a 17:24 arrival).
 * The roadbook time is an estimate, so the margin absorbs a stage run well ahead of or
 * behind schedule; the case this catches misses by an hour or more, not by minutes.
 */
const STALE_AFTER_MS = 30 * 60 * 1000;

const round2 = (n) => Math.round(n * 100) / 100;

/** @param {string} code @returns {string} */
function emojiFor(code) {
  return EMOJI[String(code).slice(0, 2)] ?? '·';
}

/**
 * ASO gives schedules as a bare local time ('17:40:00') and meteoAt as a full ISO stamp in
 * the same zone. Borrowing the date and offset from meteoAt is what makes them comparable
 * without assuming the viewer's timezone — or the race's.
 * @param {string} hhmmss
 * @param {string} meteoAtIso
 * @returns {number|null} ms
 */
function scheduleMs(hhmmss, meteoAtIso) {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(String(hhmmss ?? ''))) return null;
  const day = meteoAtIso.slice(0, 10);
  const offset = meteoAtIso.slice(19); // '+02:00', or '' / 'Z' if absent
  const t = Date.parse(`${day}T${hhmmss.length === 5 ? hhmmss + ':00' : hhmmss}${offset || 'Z'}`);
  return Number.isFinite(t) ? t : null;
}

/**
 * The stage's weather, point by point along the route, from `/api/checkpoint-<year>-<stage>`.
 *
 * Only a handful of checkpoints carry a reading (start, intermediate sprint, each climb,
 * finish) — enough to see rain waiting up the road rather than only where the riders
 * already are, which is all the telemetry feed's per-rider temperature can tell you.
 *
 * Two things make this work without any tracking of our own: `length` is the checkpoint's
 * cumulative distance from km 0, and the roadbook's own schedule says when the race is due
 * there. That makes `stale` a pure function of the payload — same answer live, in replay,
 * and before the stage has even started.
 *
 * @param {any} checkpoints raw payload
 * @returns {WeatherPoint[]} in ridden order
 */
export function extractWeather(checkpoints) {
  const list = checkpointList(checkpoints);
  if (!list.length) return [];
  const stageKm = Number(list[list.length - 1].length);
  if (!Number.isFinite(stageKm) || stageKm <= 0) return [];

  /** @type {WeatherPoint[]} */
  const out = [];
  const seenKm = new Set();
  for (const cp of list) {
    const m = cp.checkpointMeteo;
    if (!m || typeof m !== 'object') continue;
    const meteoAt = Date.parse(String(m.meteoAt ?? m.updatedAt ?? ''));
    if (!Number.isFinite(meteoAt)) continue;

    const kmFromStart = round2(Number(cp.length));
    // ASO lists the start twice (a 'fictive' km 0 and the real one), same reading on both.
    // Two identical icons stacked on one pixel is noise, so the first one wins.
    if (seenKm.has(kmFromStart)) continue;
    seenKm.add(kmFromStart);

    const code = String(m.currentWeatherIcon ?? '');
    const dueAt =
      scheduleMs(cp.middleSchedule, String(m.meteoAt)) ??
      scheduleMs(cp.lowSchedule, String(m.meteoAt)) ??
      scheduleMs(cp.highSchedule, String(m.meteoAt));
    const temp = Number(m.temperature);
    const force = Number(m.windForce);

    out.push({
      id: String(m.id ?? `${cp.checkpoint}@${kmFromStart}`),
      place: String(cp.place ?? cp.road ?? '').trim() || `km ${kmFromStart}`,
      kmFromStart,
      kmToGo: round2(stageKm - kmFromStart),
      code,
      emoji: emojiFor(code),
      desc: String(m.currentWeatherDesc ?? '').trim(),
      isWet: WET.has(code.slice(0, 2)),
      tempC: Number.isFinite(temp) ? temp : null,
      windForce: Number.isFinite(force) ? force : null,
      windDir: String(m.windDirection ?? '').trim(),
      meteoAt,
      dueAt,
      stale: dueAt != null && meteoAt > dueAt + STALE_AFTER_MS,
    });
  }
  return out;
}

/**
 * The next wet point ahead of a rider, or null when the road ahead is dry (or unknown).
 * Stale readings are never "ahead" of anyone by definition, so they are skipped.
 * @param {WeatherPoint[]} points
 * @param {number|null} kmToFinish  where the rider is
 * @returns {WeatherPoint|null}
 */
export function wetAhead(points, kmToFinish) {
  if (!Number.isFinite(kmToFinish)) return null;
  let best = null;
  for (const p of points) {
    if (p.stale || !p.isWet) continue;
    if (p.kmToGo >= kmToFinish) continue; // behind them, or right where they are
    if (!best || p.kmToGo > best.kmToGo) best = p; // nearest ahead = largest kmToGo below theirs
  }
  return best;
}
