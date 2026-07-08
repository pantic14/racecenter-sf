// @ts-check

/**
 * @typedef {Object} RoutePoint
 * @property {number} lat
 * @property {number} lon
 * @property {number} alt meters
 * @property {number} kmDone
 * @property {number} kmToGo
 */

/**
 * Parse a racecenter profile CSV (header row, then
 * lat;lon;alt;...;kmDone(col 7);kmToGo(col 8)) ONCE into an array of points.
 * @param {string} text
 * @returns {RoutePoint[]}
 */
export function parseRouteCsv(text) {
  /** @type {RoutePoint[]} */
  const points = [];
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < 9) continue;
    const lat = parseFloat(cols[0]);
    const lon = parseFloat(cols[1]);
    const kmDone = parseFloat(cols[7]);
    if (!Number.isFinite(lat) || !Number.isFinite(kmDone)) continue;
    points.push({
      lat,
      lon,
      alt: parseFloat(cols[2]),
      kmDone,
      kmToGo: parseFloat(cols[8]),
    });
  }
  return points;
}

/**
 * @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2
 * @returns {number} distance in km
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Interpolated altitude at a kmDone position (points are sorted by kmDone).
 * @param {RoutePoint[]} points
 * @param {number} kmDone
 */
export function altitudeAt(points, kmDone) {
  if (!points.length) return 0;
  let lo = 0;
  let hi = points.length - 1;
  if (kmDone <= points[0].kmDone) return points[0].alt;
  if (kmDone >= points[hi].kmDone) return points[hi].alt;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].kmDone <= kmDone) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  const span = b.kmDone - a.kmDone;
  return span > 0 ? a.alt + ((b.alt - a.alt) * (kmDone - a.kmDone)) / span : a.alt;
}

const WINDOW = 300; // ± points searched around the previous match (~±9 km)

/**
 * GPS→route snapper with a per-rider monotonic index cache: riders only move
 * forward, so the previous match's neighborhood is searched first and a full
 * scan only happens on a cache miss.
 * @param {RoutePoint[]} points
 */
export function createSnapper(points) {
  /** @type {Map<string|number, number>} rider key -> last matched index */
  const lastIndex = new Map();

  /**
   * @param {number} lat @param {number} lon
   * @param {string|number} key rider identifier for the cache
   * @returns {{point: RoutePoint, deltaKm: number, error: boolean}|null}
   */
  function snap(lat, lon, key) {
    if (!points.length) return null;

    function scan(from, to) {
      let best = -1;
      let bestDist = Infinity;
      for (let i = Math.max(0, from); i < Math.min(points.length, to); i++) {
        const d = haversineDistance(lat, lon, points[i].lat, points[i].lon);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return { best, bestDist };
    }

    const prev = lastIndex.get(key);
    let result = prev != null ? scan(prev - WINDOW / 6, prev + WINDOW) : { best: -1, bestDist: Infinity };
    if (result.best < 0 || result.bestDist > 0.05) {
      const full = scan(0, points.length);
      if (full.bestDist < result.bestDist) result = full;
    }
    if (result.best < 0) return null;
    lastIndex.set(key, result.best);
    return {
      point: points[result.best],
      deltaKm: result.bestDist,
      error: result.bestDist > 0.05, // same 50 m confidence threshold as before
    };
  }

  return snap;
}
