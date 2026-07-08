// @ts-check

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
});

/** @param {import('../data/tick.js').Tick} tick */
export function applyTick(tick) {
  race.tick = tick;
  race.status.lastTickAt = Date.now();
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
