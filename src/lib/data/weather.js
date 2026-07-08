// @ts-check

/**
 * @typedef {Object} Weather
 * @property {number} speed      wind, km/h at 10 m
 * @property {number} direction  degrees the wind blows FROM (meteorological)
 * @property {number} gusts      wind gusts, km/h
 * @property {number} temp       air temperature, °C at 2 m
 * @property {number} precip     precipitation of the last hour, mm
 */

/**
 * Best-effort weather cache backed by Open-Meteo (free, keyless, CORS-open).
 *
 * `get()` is synchronous: it returns whatever is cached for the position (or
 * null) and, when that is missing or stale, fires a background refresh so the
 * next tick can pick up fresh data. Positions are snapped to a coarse grid so
 * a whole group — and a few km of road — share one lookup, and errors are
 * swallowed (wind is a nice-to-have overlay, never a blocker).
 */
export function createWeatherCache({
  ttlMs = 10 * 60 * 1000,
  grid = 0.1, // ~11 km cells
  fetchImpl = fetch,
} = {}) {
  /** @type {Map<string, {data: Weather|null, fetchedAt: number, fetching: boolean}>} */
  const cache = new Map();

  const keyOf = (lat, lon) =>
    `${Math.round(lat / grid)}:${Math.round(lon / grid)}`;

  async function refresh(key, lat, lon) {
    const entry = cache.get(key);
    if (entry) entry.fetching = true;
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}` +
        `&longitude=${lon.toFixed(2)}` +
        `&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
        `&wind_speed_unit=kmh`;
      const res = await fetchImpl(url);
      if (!res.ok) throw new Error(`weather ${res.status}`);
      const json = await res.json();
      const c = json?.current;
      const data =
        c && Number.isFinite(c.wind_speed_10m)
          ? {
              speed: c.wind_speed_10m,
              direction: c.wind_direction_10m,
              gusts: c.wind_gusts_10m,
              temp: c.temperature_2m,
              precip: c.precipitation,
            }
          : null;
      cache.set(key, { data, fetchedAt: Date.now(), fetching: false });
    } catch (err) {
      // keep any stale data; just clear the in-flight flag and back off via fetchedAt
      const prev = cache.get(key);
      cache.set(key, {
        data: prev?.data ?? null,
        fetchedAt: Date.now(),
        fetching: false,
      });
      if (typeof console !== 'undefined') console.warn('[weather]', err);
    }
  }

  /**
   * @param {number|null} lat @param {number|null} lon
   * @returns {Weather|null} cached weather for the position, if any
   */
  function get(lat, lon) {
    if (lat == null || lon == null) return null;
    const key = keyOf(lat, lon);
    const entry = cache.get(key);
    const stale = !entry || Date.now() - entry.fetchedAt > ttlMs;
    if (stale && !entry?.fetching) {
      if (!entry) cache.set(key, { data: null, fetchedAt: 0, fetching: false });
      refresh(key, lat, lon);
    }
    return entry?.data ?? null;
  }

  return { get };
}
