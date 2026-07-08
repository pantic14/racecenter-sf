// @ts-check

/**
 * @typedef {Object} RiderTick
 * @property {number} bib
 * @property {number} kmToFinish
 * @property {number} secToFirstRider
 * @property {number} kph
 * @property {number} kphAvg
 * @property {number|null} lat
 * @property {number|null} lon
 * @property {number|null} alt
 */

/**
 * @typedef {Object} Tick
 * @property {number} timeStamp  unix seconds
 * @property {RiderTick[]} riders  sorted by secToFirstRider
 */

/**
 * Normalize a raw `telemetryCompetitor-<year>` SSE payload into a Tick.
 * @param {any} payload  parsed SSE message ({bind, data:{TimeStamp, Riders}})
 * @returns {Tick|null}
 */
export function normalizeTelemetry(payload) {
  const raw = payload?.data?.Riders;
  if (!Array.isArray(raw)) return null;
  const riders = [];
  for (const r of raw) {
    if (!r || r.Bib == null) continue;
    riders.push({
      bib: Number(r.Bib),
      kmToFinish: Number(r.kmToFinish),
      secToFirstRider: Number(r.secToFirstRider) || 0,
      kph: Number(r.kph),
      kphAvg: Number(r.kphAvg),
      lat: r.Latitude != null ? Number(r.Latitude) : null,
      lon: r.Longitude != null ? Number(r.Longitude) : null,
      alt: r.mAlt != null ? Number(r.mAlt) : null,
    });
  }
  // since 2026 riders aren't always ordered by gap in the feed
  riders.sort((a, b) => a.secToFirstRider - b.secToFirstRider);
  return {
    timeStamp: Number(payload.data.TimeStamp) || Date.now() / 1000,
    riders,
  };
}
