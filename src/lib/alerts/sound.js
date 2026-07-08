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
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.4;
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);
}
