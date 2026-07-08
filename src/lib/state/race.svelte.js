// @ts-check
import { groupRiders } from '../domain/grouping.js';
import { trackGroups } from '../domain/groupTracking.js';
import { createTrendTracker } from '../domain/trends.js';
import { settings } from './settings.svelte.js';

const trendTracker = createTrendTracker();

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
  routePoints = points && points.length ? points : null;
  race.routeVersion++;
}

export function getRoute() {
  return routePoints;
}

/** @param {import('../data/tick.js').Tick} tick */
export function applyTick(tick) {
  race.tick = tick;
  race.groups = trackGroups(race.groups, groupRiders(tick.riders, settings.minGap));
  race.trends = trendTracker.update(race.groups, tick.timeStamp);
  race.status.lastTickAt = Date.now();
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
