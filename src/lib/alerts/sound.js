// @ts-check

/** @type {AudioContext|null} */
let ctx = null;
let lastBeepAt = 0;

/**
 * Short beep on a single shared AudioContext.
 * A small cooldown keeps a rider stuck at 3 km/h from beeping every second.
 */
export function beep(frequency = 240, durationMs = 60, cooldownMs = 3000) {
  const now = Date.now();
  if (now - lastBeepAt < cooldownMs) return;
  lastBeepAt = now;

  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  tone(ctx.currentTime, frequency, durationMs);
}

/** @param {number} startAt AudioContext time @param {number} freq @param {number} durationMs */
function tone(startAt, freq, durationMs) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.4;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationMs / 1000);
}

/** Distinct beep sequences per alert type. */
export const PATTERNS = {
  drop: [
    { f: 520, d: 120 },
    { f: 370, d: 200 },
  ],
  gap: [{ f: 440, d: 160 }],
  break: [
    { f: 660, d: 90 },
    { f: 660, d: 90 },
    { f: 880, d: 150 },
  ],
};

/** @param {{f: number, d: number}[]} pattern */
export function playPattern(pattern) {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  let at = ctx.currentTime;
  for (const step of pattern) {
    tone(at, step.f, step.d);
    at += (step.d + 70) / 1000;
  }
}
