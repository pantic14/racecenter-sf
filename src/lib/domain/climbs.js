// @ts-check

/**
 * @typedef {Object} Climb
 * @property {string} id
 * @property {string} name          as ASO writes it: 'Col du Tourmalet (2 115 m) Souvenir…'
 * @property {string|null} cat      '4'|'3'|'2'|'1'|'HC'; null when uncategorised
 * @property {number} footKmToGo    kmToFinish where the climb starts
 * @property {number} summitKmToGo  kmToFinish of the summit (0 for a summit finish)
 * @property {number} lengthKm
 * @property {number} gain          meters of ascent
 * @property {number} avgPct        average gradient
 * @property {number|null} summitAlt
 * @property {boolean} isFinish     true when the summit IS the finish line
 */

/**
 * @typedef {Object} ClimbTime
 * @property {number} bib
 * @property {number} secs   foot-to-summit ascent time
 * @property {number} vam    m/h over the climb
 * @property {number} kph    average speed over the climb
 */

/** ASO's category codes. 'X' (an uncategorised rise) and anything new map to null. */
const CATS = { 1: '1', 2: '2', 3: '3', 4: '4', H: 'HC' };

/**
 * The stage's climbs, in ridden order, from `/api/checkpoint-<year>-<stage>`.
 *
 * This is ASO's own data — name (properly accented, unlike the trace's), length, average
 * gradient and category all come stated rather than inferred. Each checkpoint's `length`
 * is its cumulative distance from km 0 (monotonic, ending exactly on the official stage
 * length), so a summit's kmToFinish is `stageLength - length`, and the foot is that plus
 * the climb's own length. There is nothing left to measure.
 *
 * A foot can land slightly beyond km 0 (Col Bayard on 2026 stage 19 starts 0.07 km before
 * the official start): the neutralised run-in is real road, and riders report kmToFinish
 * above the stage length there, so it still gets crossed. Left as ASO states it.
 *
 * @param {any} checkpoints  parsed /api/checkpoint-<year>-<stage> payload
 * @returns {Climb[]}
 */
export function extractClimbs(checkpoints) {
  const list = checkpointList(checkpoints);
  if (!list.length) return [];
  // Cumulative and monotonic, so the last checkpoint sits on the finish line.
  const stageKm = list[list.length - 1].length;
  if (!(stageKm > 0)) return [];

  /** @type {Climb[]} */
  const climbs = [];
  for (const cp of list) {
    for (const s of cp.checkpointSummits ?? []) {
      const lengthKm = Number(s?.length) / 1000;
      const avgPct = Number.parseFloat(s?.state);
      if (!(lengthKm > 0) || !Number.isFinite(avgPct)) continue;
      const summitKmToGo = round2(stageKm - Number(cp.length));
      const alt = Number(s?.summit?.altitude);
      climbs.push({
        id: String(s.id ?? `${s.number}@${summitKmToGo}`),
        name: String(s?.summit?.name ?? '').trim() || `Climb ${s?.number ?? '?'}`,
        cat: CATS[s?.code] ?? null,
        summitKmToGo,
        footKmToGo: round2(summitKmToGo + lengthKm),
        lengthKm: round2(lengthKm),
        avgPct,
        // Not published; implied by the two figures that are. Within ~1% of the ascent
        // measured off the altitude profile (Tourmalet: 1248 m here, 1258 m there).
        gain: Math.round((lengthKm * 1000 * avgPct) / 100),
        summitAlt: Number.isFinite(alt) ? alt : null,
        isFinish: summitKmToGo === 0,
      });
    }
  }
  climbs.sort((a, b) => b.summitKmToGo - a.summitKmToGo); // ridden order
  return climbs;
}

/**
 * The payload is an array holding one object keyed '0','1','2'… — not a list. Normalised
 * here so nothing downstream has to know that.
 * @param {any} checkpoints
 */
function checkpointList(checkpoints) {
  const map = Array.isArray(checkpoints) ? checkpoints[0] : checkpoints;
  if (!map || typeof map !== 'object') return [];
  return Object.values(map)
    .filter((c) => c && typeof c === 'object' && Number.isFinite(Number(c.checkpoint)) && Number.isFinite(Number(c.length)))
    .sort((a, b) => Number(a.checkpoint) - Number(b.checkpoint));
}

/**
 * A crossing is timed by interpolating between the two frames either side of it. If those
 * frames are further apart than this, the rider dropped off the feed across the line and
 * the interpolation is a guess over unknown ground, so the climb is not timed for them —
 * an invented time would sit in a classification looking exactly like a measured one.
 */
const MAX_BRACKET_S = 60;

/**
 * A step implying a road speed above this is the feed resyncing a rider's kmToFinish, not
 * riding: it can teleport them a kilometre within one 6 s frame (bib 48 "covered" 1.06 km
 * in 6 s — 636 km/h — on 2026-07-12). Such a step crosses the foot and the summit at once
 * and reports an ascent of seconds, so it is dropped whole.
 *
 * Looser than vam.js's 80: that only ever judges a rider who is climbing, whereas a
 * crossing can be met at the bottom of a fast descent, where 90 km/h is real.
 */
const MAX_PLAUSIBLE_KPH = 120;

/**
 * kmToFinish never actually reaches 0, so a summit finish would otherwise never be timed:
 * the feed stops a few metres out for the riders it follows home (min 0.02 km), and much
 * earlier for everyone else. So the line counts as crossed inside this margin.
 *
 * The bigger consequence is not the margin but who is left: the feed stops tracking the
 * median rider **6.5 km from the line** (2026 stage 6), so only ~38 of 177 are timed up a
 * summit finish. Those 38 do include the leaders — Pogacar, Vingegaard, Evenepoel — but the
 * cut is not clean, and riders in the same group on the same second can be missing. A
 * summit-finish classification is therefore partial by nature, not by bug. The time itself
 * is measured to this margin rather than the line, leaving VAM overstated by well under 1%.
 */
const FINISH_EPS_KM = 0.1;

/**
 * Times riders up each climb, live or in replay: it watches kmToFinish cross the foot and
 * the summit and interpolates the moment of each. Feed it every tick; ask it for a
 * classification whenever you want to draw one.
 *
 * Kept as a tracker rather than computed from history because the extension only ever sees
 * one tick at a time — the same reason trends.js and vam.js work this way.
 */
export function createClimbTracker() {
  /** @type {Map<number, {km: number, t: number}>} bib -> previous sample */
  const prev = new Map();
  /** @type {Map<string, Map<number, {foot?: number, summit?: number}>>} climb id -> bib -> crossing times */
  const crossings = new Map();

  /**
   * @param {import('../data/tick.js').Tick} tick
   * @param {Climb[]} climbs
   */
  function update(tick, climbs) {
    const t = tick.timeStamp;
    for (const rider of tick.riders) {
      const km = rider.kmToFinish;
      if (!Number.isFinite(km)) continue;
      const p = prev.get(rider.bib);
      prev.set(rider.bib, { km, t });
      // Only a real forward move, over a short interval, at a possible speed, can carry a
      // crossing.
      if (!p || !(p.km > km) || t <= p.t || t - p.t > MAX_BRACKET_S) continue;
      if ((p.km - km) / ((t - p.t) / 3600) > MAX_PLAUSIBLE_KPH) continue;

      for (const climb of climbs) {
        let at = crossings.get(climb.id);
        if (!at) crossings.set(climb.id, (at = new Map()));
        const foot = crossedAt(p, km, t, climb.footKmToGo);
        const summit = crossedAt(p, km, t, climb.isFinish ? FINISH_EPS_KM : climb.summitKmToGo);
        if (foot == null && summit == null) continue;
        const entry = at.get(rider.bib) ?? {};
        if (foot != null) entry.foot = foot;
        if (summit != null) entry.summit = summit;
        at.set(rider.bib, entry);
      }
    }
  }

  /**
   * Ascent times for one climb, fastest first. Riders still on the climb, or who joined
   * the feed partway up, are absent rather than guessed at.
   * @param {Climb} climb
   * @returns {ClimbTime[]}
   */
  function times(climb) {
    const at = crossings.get(climb.id);
    if (!at) return [];
    /** @type {ClimbTime[]} */
    const out = [];
    for (const [bib, x] of at) {
      if (x.foot == null || x.summit == null || !(x.summit > x.foot)) continue;
      const secs = x.summit - x.foot;
      const hours = secs / 3600;
      out.push({
        bib,
        secs,
        vam: Math.round(climb.gain / hours),
        kph: Math.round((climb.lengthKm / hours) * 10) / 10,
      });
    }
    out.sort((a, b) => a.secs - b.secs);
    return out;
  }

  return { update, times };
}

/**
 * Interpolated moment a rider passed `targetKm`, or null if this step didn't cross it.
 * @param {{km: number, t: number}} p  previous sample
 * @param {number} km  current kmToFinish @param {number} t current time
 * @param {number} targetKm
 */
function crossedAt(p, km, t, targetKm) {
  if (!(p.km >= targetKm && km < targetKm)) return null;
  const span = p.km - km;
  return span > 0 ? p.t + (t - p.t) * ((p.km - targetKm) / span) : t;
}

const round2 = (n) => Math.round(n * 100) / 100;
