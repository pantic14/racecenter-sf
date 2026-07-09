// @ts-check
import { groupRiders } from '../domain/grouping.js';
import { trackGroups } from '../domain/groupTracking.js';
import { createTrendTracker } from '../domain/trends.js';
import { classifyWind } from '../domain/wind.js';
import { settings } from './settings.svelte.js';

let trendTracker = createTrendTracker();
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
  /** @type {Record<string, 'up'|'down'|null>} gap trend per group id (~30 s window) */
  trends: {},
  /** IndexedDB key for this session's group history ('yyyy-mm-dd' or 'mock:…') */
  historyKey: '',
});

/** @type {import('../domain/route.js').RoutePoint[]|null} */
let routePoints = null;

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

/** @param {import('../data/tick.js').Tick} tick */
export function applyTick(tick) {
  race.tick = tick;
  const groups = trackGroups(race.groups, groupRiders(tick.riders, settings.minGap));
  for (const group of groups) {
    const lead = group.riders[0];
    group.tempC = Number.isFinite(lead?.tempC) ? lead.tempC : null;
    group.windKph = Number.isFinite(lead?.windKph) ? lead.windKph : null;
    group.relWind =
      lead && Number.isFinite(lead.windDir) && Number.isFinite(lead.course)
        ? classifyWind(lead.windDir, lead.course)
        : null;
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
