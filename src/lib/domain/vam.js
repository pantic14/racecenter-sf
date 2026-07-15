// @ts-check
import { altitudeAtKmToGo } from './route.js';

/** Trailing road-distance windows (meters) for the windowed VAM values. */
const WINDOWS = [500, 1000, 5000];
const MAX_WINDOW_KM = 5; // largest window; the trail is pruned a bit beyond this

// The feed resyncs a rider's kmToFinish now and then, teleporting them up to a kilometre
// within one 6 s frame (bib 48 "covered" 1.06 km in 6 s — 636 km/h — on 2026-07-12). The
// altitude gain is real but the elapsed time is not, which over a 500 m window produced
// VAMs of 32000 m/h. Any window implying a road speed this high is fiction, not a rider.
const MAX_PLAUSIBLE_KPH = 80;
// Physical ceiling for the WINDOWED values only — the instantaneous one is exempt by
// design. Sustaining a climb rate this high over hundreds of metres is not human — the
// best ever is ~2000 m/h — so past it the altitude data is wrong, not the rider: report
// nothing rather than a fantasy number.
// Rejecting teleports alone is not enough — noise in the trace's ~100 m-spaced elevation
// still spikes the short windows (measured: 0.14% of samples over two 2026 stages).
const MAX_VAM = 3000;

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
      // Deliberately NOT held to MAX_VAM: that ceiling is about what a rider can SUSTAIN,
      // and this is a momentary speed×grade product, not a climb rate. Riders attacking
      // hit genuinely huge instantaneous values on steep ramps, and flattening those to
      // null would hide the very moments worth watching.
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
 * VAM (m/h) over the trailing `windowM` meters of road: null when the trail doesn't yet
 * span the window, there's no net ascent, or the numbers aren't physically possible.
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
  if ((ref.km - km) / dtH > MAX_PLAUSIBLE_KPH) return null; // feed resync, not a rider
  const vam = gain / dtH;
  return vam > MAX_VAM ? null : Math.round(vam);
}
