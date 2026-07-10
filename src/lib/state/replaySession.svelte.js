// @ts-check
import { race, applyTick, resetRace } from './race.svelte.js';
import { ui } from './ui.svelte.js';
import { fetchRecording, parseRecording } from '../data/archive.js';
import { createReplayer } from '../data/replay.js';

// Orchestrates full-stage replay. It drives the same applyTick() the live source
// uses, so the three views and the alerts revive the stage on their own. App owns
// the live SSE and the alert engine, so it registers those side-effects here.

/** @type {{stopLive: () => void, startLive: () => void, resetAlertEngine: () => void}} */
let hooks = { stopLive() {}, startLive() {}, resetAlertEngine() {} };

/** @param {Partial<typeof hooks>} h */
export function registerReplayHooks(h) {
  hooks = { ...hooks, ...h };
}

/** @type {ReturnType<typeof createReplayer>|null} */
let replayer = null;
/** @type {{riders: any, teams: any, stage: any}|null} */
let liveBackup = null;

/** allCompetitors arrays are stored as-is in recordings; race.riders is keyed by bib. */
function ridersByBib(riders) {
  if (!Array.isArray(riders)) return riders ?? {};
  /** @type {Record<number, any>} */
  const byBib = {};
  for (const r of riders) if (r && r.bib != null) byBib[r.bib] = r;
  return byBib;
}

/**
 * @param {{id: string, ticks: import('../data/archive.js').ReplayTick[], rest: any, date?: string}} rec
 */
function enter({ id, ticks, rest, date }) {
  // Back up the REAL live REST only on the first entry; loading another recording
  // while already replaying must not overwrite it with the previous one's snapshot.
  if (!ui.replay) {
    hooks.stopLive();
    liveBackup = { riders: race.riders, teams: race.teams, stage: race.stage };
  } else {
    replayer?.stop();
  }
  resetRace();
  hooks.resetAlertEngine();

  // Swap in the recording's embedded REST snapshot so names/teams/stage are the
  // stage's own, correct forever.
  if (rest?.riders) race.riders = ridersByBib(rest.riders);
  if (rest?.teams) race.teams = rest.teams;
  // rest.stages holds the whole season keyed by date, so pick THIS recording's stage
  // by its date; fall back to the first key for single-stage synthetic fixtures.
  const stages = rest?.stages ?? {};
  race.stage = stages[date] ?? stages[Object.keys(stages)[0]] ?? null;

  replayer = createReplayer({
    ticks,
    onTick: (tick) => applyTick(tick),
    onProgress: (p) => {
      if (ui.replay) ui.replay = { ...ui.replay, i: p.i, total: p.total, t: p.t, playing: p.playing };
    },
  });
  ui.replay = { id, playing: false, speed: 1, i: -1, total: ticks.length, t: 0 };
  replayer.play();
}

/** Load a recording from a local .json.gz File/Blob (dev fallback). @param {Blob} blob @param {string} [id] */
export async function playRecordingBlob(blob, id = 'local') {
  const { ticks, rest, meta } = await parseRecording(blob);
  enter({ id, ticks, rest, date: meta?.date });
}

/**
 * Load a recording from the data repo (cached in IndexedDB after first download).
 * @param {string} baseUrl
 * @param {import('../data/archive.js').IndexEntry} entry
 * @param {(received: number, total: number) => void} [onProgress]
 */
export async function playRecordingEntry(baseUrl, entry, onProgress) {
  const { ticks, rest } = await fetchRecording(baseUrl, entry, onProgress);
  enter({ id: entry.id, ticks, rest, date: entry.date });
}

export function replayPlay() {
  replayer?.play();
}

export function replayPause() {
  replayer?.pause();
}

/** Toggle play/pause off the replayer's REAL state (ui.replay.playing is only a mirror). */
export function replayTogglePlay() {
  if (!replayer) return;
  if (replayer.playing) replayer.pause();
  else replayer.play();
}

/** True while a replayer exists and is actively playing (used by the scrubber). */
export function isReplaying() {
  return !!replayer?.playing;
}

/** @param {number} i absolute tick index */
export function replaySeek(i) {
  // Reset derived state + alert engine so trends/alerts never span the jump.
  resetRace();
  hooks.resetAlertEngine();
  replayer?.seek(i);
}

/** @param {number} s speed multiplier (1/5/10/30/60) */
export function replaySetSpeed(s) {
  replayer?.setSpeed(s);
  if (ui.replay) ui.replay.speed = s;
}

/** Leave replay: restore the real REST and reopen the live source. */
export function exitReplay() {
  replayer?.stop();
  replayer = null;
  resetRace();
  hooks.resetAlertEngine();
  if (liveBackup) {
    race.riders = liveBackup.riders;
    race.teams = liveBackup.teams;
    race.stage = liveBackup.stage;
    liveBackup = null;
  }
  ui.replay = null;
  hooks.startLive();
}
