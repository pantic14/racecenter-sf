// @ts-check

/**
 * Drive a recorded stage tick-by-tick, feeding the same applyTick() the live and
 * mock sources use. Timing comes from each tick's `dt` (ms since the previous
 * shown tick) divided by the current speed. Seek is a direct array index.
 *
 * Timers are injectable so the loop can be unit-tested deterministically.
 *
 * @param {{
 *   ticks: import('./archive.js').ReplayTick[],
 *   onTick: (tick: import('./archive.js').ReplayTick, i: number) => void,
 *   onProgress?: (p: {i: number, total: number, t: number, playing: boolean}) => void,
 *   onEnd?: () => void,
 *   schedule?: (fn: () => void, ms: number) => any,
 *   cancel?: (h: any) => void,
 * }} opts
 */
// Recordings from the field carry gaps (feed drops, neutralized zones, recorder
// restarts) whose dt is minutes long. At ×1 these are played faithfully: the
// replay is meant to run alongside the live TV broadcast, and skipping a gap
// would drift the replay ahead of the feed. Only the fast-forward speeds cap the
// gap (to this max) so they don't stall for minutes on a multi-minute hole.
const MAX_GAP_MS = 5000;

export function createReplayer({
  ticks,
  onTick,
  onProgress,
  onEnd,
  schedule = (fn, ms) => setTimeout(fn, ms),
  cancel = clearTimeout,
}) {
  const total = ticks.length;
  let i = -1; // nothing shown yet
  let speed = 1;
  let playing = false;
  let timer = null;

  function report() {
    onProgress?.({ i, total, t: i >= 0 ? ticks[i].timeStamp : 0, playing });
  }

  function show(idx) {
    i = Math.max(0, Math.min(total - 1, idx));
    onTick(ticks[i], i);
    report();
  }

  function loop() {
    cancel(timer);
    if (!playing) return;
    if (i >= total - 1) {
      playing = false;
      report();
      onEnd?.();
      return;
    }
    const raw = ticks[i + 1].dt || 0;
    const dt = speed > 1 ? Math.min(raw, MAX_GAP_MS) : raw; // ×1 stays TV-faithful
    timer = schedule(() => {
      show(i + 1);
      loop();
    }, Math.max(dt / speed, 0));
  }

  return {
    play() {
      if (playing || total === 0) return;
      playing = true;
      if (i < 0) show(0); // first play shows the opening tick immediately
      else report();
      loop();
    },
    pause() {
      if (!playing) return;
      playing = false;
      cancel(timer);
      report();
    },
    /** @param {number} idx jump to an absolute tick index */
    seek(idx) {
      show(idx);
      if (playing) loop();
    },
    /** @param {number} s time multiplier (1, 5, 10, 30, 60) */
    setSpeed(s) {
      speed = s > 0 ? s : 1;
      if (playing) loop(); // reschedule the pending wait at the new speed
    },
    stop() {
      playing = false;
      cancel(timer);
      i = -1;
    },
    get index() {
      return i;
    },
    get total() {
      return total;
    },
    get playing() {
      return playing;
    },
  };
}
