// @ts-check

/**
 * Compass bearing (degrees, 0 = north, clockwise) from point A to point B.
 * @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2
 * @returns {number} 0..360
 */
export function bearing(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const φ1 = lat1 * toRad;
  const φ2 = lat2 * toRad;
  const Δλ = (lon2 - lon1) * toRad;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) / toRad + 360) % 360;
}

/**
 * Rough great-circle distance in metres (equirectangular; fine for <1 km hops).
 * @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2
 */
export function distanceM(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const R = 6371000;
  const x = (lon2 - lon1) * toRad * Math.cos(((lat1 + lat2) / 2) * toRad);
  const y = (lat2 - lat1) * toRad;
  return Math.hypot(x, y) * R;
}

/**
 * Travel-heading tracker: bearing of each group's leader over its recent
 * displacement. Uses displacement (not the last single tick) so the heading is
 * stable and immune to GPS jitter while stationary.
 */
export function createHeadingTracker({ minMoveM = 30, windowS = 20 } = {}) {
  /** @type {Map<string, {t: number, lat: number, lon: number}[]>} */
  const history = new Map();

  /**
   * @param {import('./grouping.js').Group[]} groups
   * @param {number} t tick timestamp (unix seconds)
   * @returns {Record<string, number|null>} heading in degrees per group id
   */
  function update(groups, t) {
    /** @type {Record<string, number|null>} */
    const headings = {};
    const seen = new Set();

    for (const group of groups) {
      const lead = group.riders[0];
      if (lead?.lat == null || lead?.lon == null) {
        headings[group.id] = null;
        continue;
      }
      seen.add(group.id);
      const hist = history.get(group.id) ?? [];
      hist.push({ t, lat: lead.lat, lon: lead.lon });
      while (hist.length > 1 && t - hist[0].t > windowS) hist.shift();
      history.set(group.id, hist);

      // oldest sample far enough away to give a meaningful bearing
      let heading = null;
      for (const p of hist) {
        if (distanceM(p.lat, p.lon, lead.lat, lead.lon) >= minMoveM) {
          heading = bearing(p.lat, p.lon, lead.lat, lead.lon);
          break;
        }
      }
      headings[group.id] = heading;
    }

    for (const id of [...history.keys()]) {
      if (!seen.has(id)) history.delete(id);
    }
    return headings;
  }

  return { update };
}
