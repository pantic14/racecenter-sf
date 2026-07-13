// @ts-check
import { altitudeAtKmToGo } from './route.js';

/** Trailing road-distance windows (meters) for the windowed VAM values. */
const WINDOWS = [500, 1000, 5000];
const MAX_WINDOW_KM = 5; // largest window; the trail is pruned a bit beyond this

/**
 * Per-rider VAM tracker (velocidad de ascensión media, m/h). Keeps each rider's
 * {t, km, alt} trail keyed by bib — so the windowed values survive group
 * splits/merges — and attaches the instantaneous + windowed VAM to each rider
 * object every tick. Mirrors the rolling pattern of trends.js.
 */
export function createVamTracker() {
  /** @type {Map<number, {t: number, km: number, alt: number}[]>} bib -> trail (oldest first) */
  const trails = new Map();

  /**
   * @param {import('../data/tick.js').Tick} tick
   * @param {import('./route.js').RoutePoint[]|null} routePoints  clean altitude source; null falls back to the feed's GPS alt
   */
  function update(tick, routePoints) {
    const t = tick.timeStamp;
    const hasRoute = !!(routePoints && routePoints.length);
    const seen = new Set();

    for (const rider of tick.riders) {
      seen.add(rider.bib);

      // Instantaneous VAM straight from the feed's speed & grade (no history):
      // kph·1000·(gradient/100) = kph·gradient·10 m/h. Only meaningful climbing.
      rider.vamInst =
        Number.isFinite(rider.kph) && Number.isFinite(rider.gradient) && rider.gradient > 0
          ? Math.round(rider.kph * rider.gradient * 10)
          : null;

      const km = rider.kmToFinish;
      const alt = hasRoute
        ? altitudeAtKmToGo(/** @type {any} */ (routePoints), km)
        : rider.alt;

      if (!Number.isFinite(km) || alt == null || !Number.isFinite(alt)) {
        rider.vam500 = rider.vam1k = rider.vam5k = null;
        continue;
      }

      const trail = trails.get(rider.bib) ?? [];
      trail.push({ t, km, alt: /** @type {number} */ (alt) });
      // drop samples that fall beyond the largest window's road distance
      while (trail.length > 1 && trail[0].km - km > MAX_WINDOW_KM + 0.2) trail.shift();
      trails.set(rider.bib, trail);

      rider.vam500 = windowVam(trail, km, t, WINDOWS[0]);
      rider.vam1k = windowVam(trail, km, t, WINDOWS[1]);
      rider.vam5k = windowVam(trail, km, t, WINDOWS[2]);
    }

    for (const bib of [...trails.keys()]) if (!seen.has(bib)) trails.delete(bib);
  }

  return { update };
}

/**
 * VAM (m/h) over the trailing `windowM` meters of road: null when the trail
 * doesn't yet span the window or there's no net ascent.
 * @param {{t: number, km: number, alt: number}[]} trail  oldest first, newest = now
 * @param {number} km  current kmToFinish
 * @param {number} t   current timestamp (unix seconds)
 * @param {number} windowM  window length in meters
 * @returns {number|null}
 */
function windowVam(trail, km, t, windowM) {
  const windowKm = windowM / 1000;
  // tightest past sample still at least a full window back (km runs down as we advance)
  let ref = null;
  for (let i = 0; i < trail.length; i++) {
    if (trail[i].km - km >= windowKm) ref = trail[i];
    else break;
  }
  if (!ref) return null; // window not covered yet
  const gain = trail[trail.length - 1].alt - ref.alt;
  const dtH = (t - ref.t) / 3600;
  if (gain <= 0 || dtH <= 0) return null;
  return Math.round(gain / dtH);
}
