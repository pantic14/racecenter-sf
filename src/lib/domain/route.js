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
 * Parse ASO's `stage-<n>/trace.json` (the official altimetry: `routePoints[{lat,lon,ele}]`
 * plus `pointsOfInterest`) into the same RoutePoint[] a profile CSV yields — so it can be
 * an altitude source anywhere a route is expected. Unlike the CSV it needs no per-stage
 * URL sniffing, and it is published before the stage.
 *
 * Two traps, both verified against all 19 traces of 2026:
 *  - `routePoints` starts at the NEUTRALISED start, several km before km 0, while
 *    `totalDistance` counts from km 0. Their difference is the neutral zone (3-12.6 km).
 *  - Summing haversine over the points overshoots the real road distance by 3-7 km: GPS
 *    zigzag inflates it. So the raw geometry is a shape, not a scale.
 * The POIs resolve both: their `distanceRemaining` is exactly the feed's kmToFinish scale,
 * so anchoring the geometry on the km-0 POI puts every point on the feed's scale. Points
 * in the neutral zone keep kmToGo > the stage length, which is what the feed reports there.
 * @param {any} trace  parsed trace.json
 * @returns {RoutePoint[]}
 */
export function parseTraceJson(trace) {
  const pts = trace?.routePoints;
  if (!Array.isArray(pts) || pts.length < 2) return [];

  /** cumulative geometric distance (km) from the polyline's first point */
  const dist = [0];
  for (let i = 1; i < pts.length; i++) {
    dist.push(dist[i - 1] + haversineDistance(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon));
  }
  const geoTotal = dist[dist.length - 1];
  if (!(geoTotal > 0)) return [];

  // Anchor: the km-0 POI ('#002…'). Its distanceRemaining is the official race distance —
  // trust it over `totalDistance`, which on stage 9 of 2026 holds the neutral-inclusive
  // length instead and would stretch the whole stage by 3%.
  const km0 = (trace.pointsOfInterest ?? []).find((p) => /^#002/.test(p?.label ?? ''));
  let lengthKm = Number(km0?.distanceRemaining);
  let geoRacing = geoTotal;
  if (Number.isFinite(lengthKm) && lengthKm > 0) {
    // Only the opening quarter is searched: the neutral zone never exceeds ~10% of a stage,
    // and a circuit stage (Barcelona, the Champs-Élysées finale) rides the same coordinates
    // several times — an unbounded search happily anchors km 0 on a closing lap.
    geoRacing = geoTotal - dist[nearestIndex(pts, km0.lat, km0.lon, Math.ceil(pts.length / 4))];
  } else {
    // No POI. `totalDistance` is the next best scale, and bare geometry the last resort.
    lengthKm = Number(trace.totalDistance);
    if (!Number.isFinite(lengthKm) || lengthKm <= 0) lengthKm = geoTotal;
  }
  if (!(geoRacing > 0)) return [];

  const scale = lengthKm / geoRacing;
  return pts.map((p, i) => {
    const kmToGo = (geoTotal - dist[i]) * scale;
    return { lat: p.lat, lon: p.lon, alt: p.ele, kmDone: lengthKm - kmToGo, kmToGo };
  });
}

/**
 * Index of the route point closest to a lat/lon, searching pts[0..limit). Linear — only
 * used to resolve one POI per stage, so the snapper's index cache would be pure overhead.
 * @param {{lat: number, lon: number}[]} pts
 * @param {number} lat @param {number} lon
 * @param {number} [limit] exclusive upper bound on the search
 */
function nearestIndex(pts, lat, lon, limit = pts.length) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < Math.min(limit, pts.length); i++) {
    const d = haversineDistance(lat, lon, pts[i].lat, pts[i].lon);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
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

/**
 * Interpolated altitude at a kmToGo (km-to-finish) position. Points are sorted
 * by kmDone ascending, so kmToGo runs descending; the live/replay tick reports
 * kmToFinish, not kmDone, so VAM uses this rather than altitudeAt().
 * @param {RoutePoint[]} points
 * @param {number} kmToGo
 */
export function altitudeAtKmToGo(points, kmToGo) {
  if (!points.length) return 0;
  const first = points[0];
  const last = points[points.length - 1];
  if (kmToGo >= first.kmToGo) return first.alt;
  if (kmToGo <= last.kmToGo) return last.alt;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].kmToGo >= kmToGo) lo = mid;
    else hi = mid;
  }
  const a = points[lo]; // higher kmToGo (further from finish)
  const b = points[hi]; // lower kmToGo
  const span = a.kmToGo - b.kmToGo;
  return span > 0 ? a.alt + ((b.alt - a.alt) * (a.kmToGo - kmToGo)) / span : a.alt;
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
