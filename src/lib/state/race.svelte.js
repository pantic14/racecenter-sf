// @ts-check
import { createClimbTracker } from '../domain/climbs.js';
import { groupRiders } from '../domain/grouping.js';
import { trackGroups } from '../domain/groupTracking.js';
import { createTrendTracker } from '../domain/trends.js';
import { createVamTracker } from '../domain/vam.js';
import { classifyWind } from '../domain/wind.js';
import { settings } from './settings.svelte.js';

let trendTracker = createTrendTracker();
let vamTracker = createVamTracker();
let climbTracker = createClimbTracker();
// Wind, heading and temperature all come from the live feed (Course, RiderWindDir,
// kphWind, degC) — no external weather API.

/**
 * Central race state. Everything (live SSE, mock replay, future full replay)
 * feeds it through the single entry point applyTick().
 */
export const race = $state({
  status: {
    /** 'connecting' | 'live' | 'stale' | 'reconnecting' */
    sse: 'connecting',
    lastTickAt: 0,
    /** @type {{source: string, message: string}[]} */
    errors: [],
  },
  /** @type {Record<number, any>} bib -> rider info from allCompetitors */
  riders: {},
  /** @type {any[]} */
  teams: [],
  /** @type {any|null} today's stage */
  stage: null,
  /** @type {import('../data/tick.js').Tick|null} latest tick */
  tick: null,
  /** @type {import('../domain/grouping.js').Group[]} groups of the latest tick */
  groups: [],
  /** Pause freezes what the list shows; state keeps updating underneath. */
  paused: false,
  /** @type {import('../domain/grouping.js').Group[]} */
  frozenGroups: [],
  /** bumped when the route changes; the points themselves stay non-reactive */
  routeVersion: 0,
  /**
   * Categorised climbs of the stage on screen, in ridden order. Small enough to live in
   * $state (a handful per stage), unlike the route's thousands of points.
   * @type {import('../domain/climbs.js').Climb[]}
   */
  climbs: [],
  /**
   * Weather along the route, point by point (start, sprint, climbs, finish). A handful per
   * stage, like the climbs. Live it is refreshed by the feed every 30 min; in a replay it
   * is the recording's own copy, frozen as the race went past.
   * @type {import('../domain/weather.js').WeatherPoint[]}
   */
  weather: [],
  /** @type {Record<string, 'up'|'down'|null>} gap trend per group id (~30 s window) */
  trends: {},
  /** IndexedDB key for this session's group history ('yyyy-mm-dd' or 'mock:…') */
  historyKey: '',
});

/** @type {import('../domain/route.js').RoutePoint[]|null} */
let routePoints = null;
/**
 * The same climbs as race.climbs, but the raw array rather than the $state proxy: the tick
 * loop reads every climb for every rider, and there is nothing to react to in there.
 * @type {import('../domain/climbs.js').Climb[]}
 */
let climbList = [];

/**
 * Route/altimetry points live outside $state: thousands of points at 1 Hz
 * reads don't need (or want) reactive proxying.
 * @param {import('../domain/route.js').RoutePoint[]|null} points
 */
export function setRoute(points) {
  const next = points && points.length ? points : null;
  // No-op when the route is unchanged. Critical: setRoute is called synchronously
  // from an $effect, so an unconditional `routeVersion++` (a read-modify-write)
  // makes that effect read and write the same state → infinite effect loop.
  if (next === routePoints) return;
  routePoints = next;
  race.routeVersion++;
}

export function getRoute() {
  return routePoints;
}

/**
 * Replace the stage's climbs, and with them every ascent time — those belong to the stage
 * that produced them and must never leak across a swap.
 *
 * `ticks` is the whole recording when replaying. A replay knows the entire stage before it
 * plays a frame, so the classifications are computed up front and are complete from the
 * first moment: they are a record of what happened, not a scoreboard filling up. Live has
 * no ticks to give, and accrues them as the race is ridden.
 * @param {import('../domain/climbs.js').Climb[]} climbs
 * @param {import('../data/archive.js').ReplayTick[]|null} [ticks]  whole recording, when replaying
 */
export function setClimbs(climbs, ticks = null) {
  climbList = climbs; // plain reference, for the per-tick loop
  climbTracker = createClimbTracker();
  if (climbs.length && ticks?.length) {
    for (const tick of ticks) climbTracker.update(tick, climbs);
  }
  // Assigned last, on purpose: this is the write the views react to, so the tracker must
  // already hold the primed times when they re-read it.
  race.climbs = climbs;
}

/**
 * Ascent times up one climb, fastest first. Not reactive by itself — read `race.tick` in
 * the same $derived to recompute it as the race moves.
 * @param {import('../domain/climbs.js').Climb} climb
 */
export function climbTimes(climb) {
  return climbTracker.times(climb);
}

/**
 * Replace the stage's weather. Unlike the climbs this is re-called during a live stage —
 * the feed re-sends the whole checkpoint payload every 30 min — so it is a plain assignment
 * with no tracker behind it. Each point already knows whether it describes the race
 * (`stale`), which is why nothing here needs to know where the riders are.
 * @param {import('../domain/weather.js').WeatherPoint[]} points
 */
export function setWeather(points) {
  race.weather = points;
}

/**
 * Highest VAM value across a group's riders for one window key (null if none).
 * @param {import('../data/tick.js').RiderTick[]} riders
 * @param {'vamInst'|'vam500'|'vam1k'|'vam5k'} key
 * @returns {number|null}
 */
function maxVam(riders, key) {
  let m = null;
  for (const r of riders) {
    const v = r[key];
    if (Number.isFinite(v) && (m === null || v > m)) m = v;
  }
  return m;
}

/** @param {import('../data/tick.js').Tick} tick */
export function applyTick(tick) {
  race.tick = tick;
  const groups = trackGroups(race.groups, groupRiders(tick.riders, settings.minGap));
  // attaches vam* to each rider (shared with the group objects below)
  vamTracker.update(tick, getRoute());
  if (climbList.length) climbTracker.update(tick, climbList);
  for (const group of groups) {
    const lead = group.riders[0];
    group.tempC = Number.isFinite(lead?.tempC) ? lead.tempC : null;
    group.windKph = Number.isFinite(lead?.windKph) ? lead.windKph : null;
    group.gradient = Number.isFinite(lead?.gradient) ? lead.gradient : null;
    group.relWind =
      lead && Number.isFinite(lead.windDir) && Number.isFinite(lead.course)
        ? classifyWind(lead.windDir, lead.course)
        : null;
    // group VAM = its best climber (max over current members) per window
    group.vamInst = maxVam(group.riders, 'vamInst');
    group.vam500 = maxVam(group.riders, 'vam500');
    group.vam1k = maxVam(group.riders, 'vam1k');
    group.vam5k = maxVam(group.riders, 'vam5k');
  }
  race.groups = groups;
  race.trends = trendTracker.update(race.groups, tick.timeStamp);
  race.status.lastTickAt = Date.now();
}

/**
 * Wipe everything derived from the tick stream (tick/groups/trends/frozen/paused)
 * and start a fresh trend tracker. riders/teams/stage are left untouched — the
 * replay session swaps those separately. Called when entering/leaving/seeking a
 * replay so no state bleeds across the discontinuity.
 */
export function resetRace() {
  race.tick = null;
  race.groups = [];
  race.trends = {};
  race.frozenGroups = [];
  race.paused = false;
  trendTracker = createTrendTracker();
  vamTracker = createVamTracker();
  // The climb tracker is deliberately NOT reset here. Ascent times are facts about the
  // stage, not state accrued from the frames just played, so seeking must not erase them —
  // and in a replay they were all computed up front anyway. setClimbs() owns their
  // lifetime, and it runs whenever the stage itself changes.
}

export function togglePause() {
  race.paused = !race.paused;
  race.frozenGroups = race.paused ? $state.snapshot(race.groups) : [];
}

/** @param {string} status */
export function setSseStatus(status) {
  race.status.sse = status;
}

/**
 * @param {string} source
 * @param {string} message
 */
export function pushError(source, message) {
  race.status.errors.push({ source, message });
}
