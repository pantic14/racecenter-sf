// Synthesizes an original, royalty-free electronic music bed. No dependencies.
//
//   node tools/make-music.mjs                          # energetic Short bed → public/music.wav
//   node tools/make-music.mjs --soft --out public/music-soft.wav --dur 54
//
// Flags: --out <path> (rel. to project root) · --dur <seconds> · --bpm <n> · --soft
import { writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};

const SOFT = flag("soft");
const SR = 44100;
const DUR = Number(opt("dur", SOFT ? 54 : 22));
const BPM = Number(opt("bpm", SOFT ? 96 : 124));
const OUT = opt("out", "public/music.wav");

const beat = 60 / BPM;
const N = Math.floor(SR * DUR);
const buf = new Float32Array(N);

const NOTE = {
  A2: 110.0, F2: 87.31, C3: 130.81, G2: 98.0,
  A3: 220.0, C4: 261.63, E4: 329.63, F3: 174.61,
  G3: 196.0, B3: 246.94, D4: 293.66, E3: 164.81,
};

// One chord per bar (4 beats). Root drives the bass; tones drive the arp/pad.
const PROG = [
  { root: NOTE.A2, tones: [NOTE.A3, NOTE.C4, NOTE.E4] }, // Am
  { root: NOTE.F2, tones: [NOTE.F3, NOTE.A3, NOTE.C4] }, // F
  { root: NOTE.C3, tones: [NOTE.C4, NOTE.E4, NOTE.G3] }, // C
  { root: NOTE.G2, tones: [NOTE.G3, NOTE.B3, NOTE.D4] }, // G
];

const add = (i, v) => {
  if (i >= 0 && i < N) buf[i] += v;
};
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

// --- kick: pitch-swept sine on every beat (attenuated + rounder in soft mode)
const kickAmp = SOFT ? 0.5 : 0.9;
const kickDecay = SOFT ? 7 : 9;
for (let b = 0; b * beat < DUR; b++) {
  const start = Math.floor(b * beat * SR);
  const len = Math.floor(0.28 * SR);
  for (let j = 0; j < len; j++) {
    const t = j / SR;
    const f = 120 * Math.exp(-t * 24) + 48;
    add(start + j, Math.sin(2 * Math.PI * f * t) * Math.exp(-t * kickDecay) * kickAmp);
  }
}

// --- hats: short noise burst on the off-beats (skipped when soft)
if (!SOFT) {
  for (let b = 0; b * beat < DUR; b++) {
    const start = Math.floor((b + 0.5) * beat * SR);
    const len = Math.floor(0.05 * SR);
    for (let j = 0; j < len; j++) {
      const t = j / SR;
      add(start + j, (Math.random() * 2 - 1) * Math.exp(-t * 90) * 0.12);
    }
  }
}

// --- warm sustained pad (soft mode only): chord tones held across each bar
if (SOFT) {
  const totalBars = Math.ceil(DUR / (beat * 4));
  for (let bar = 0; bar < totalBars; bar++) {
    const chord = PROG[bar % PROG.length];
    const start = Math.floor(bar * 4 * beat * SR);
    const len = Math.floor(4 * beat * SR);
    for (const f of chord.tones) {
      for (let j = 0; j < len; j++) {
        const t = j / SR;
        const swell = Math.min(1, t / 0.4) * Math.min(1, (len / SR - t) / 0.4);
        add(start + j, Math.sin(2 * Math.PI * (f / 2) * t) * swell * 0.05);
      }
    }
  }
}

// --- bass + arpeggio, following the chord progression
const bassAmp = SOFT ? 0.28 : 0.35;
const arpAmp = SOFT ? 0.09 : 0.16;
const totalBeats = Math.ceil(DUR / beat);
for (let b = 0; b < totalBeats; b++) {
  const bar = Math.floor(b / 4) % PROG.length;
  const chord = PROG[bar];

  // bass note on each beat (triangle-ish)
  {
    const start = Math.floor(b * beat * SR);
    const len = Math.floor(beat * 0.95 * SR);
    for (let j = 0; j < len; j++) {
      const t = j / SR;
      const ph = chord.root * t;
      const tri = 2 * Math.abs(2 * (ph - Math.floor(ph + 0.5))) - 1;
      add(start + j, tri * env(t, 0.005, 0.18) * bassAmp);
    }
  }

  // arp: soft mode = one soft sine per beat; energetic = two saw eighths
  const steps = SOFT ? 1 : 2;
  for (let e = 0; e < steps; e++) {
    const idx = (b * steps + e) % chord.tones.length;
    const f = chord.tones[idx] * 2; // up an octave, brighter
    const start = Math.floor((b + (e / steps)) * beat * SR);
    const len = Math.floor(beat * (SOFT ? 0.9 : 0.45) * SR);
    for (let j = 0; j < len; j++) {
      const t = j / SR;
      const ph = f * t;
      const wave = SOFT
        ? Math.sin(2 * Math.PI * ph) // pure sine, mellow
        : 2 * (ph - Math.floor(ph + 0.5)); // sawtooth, bright
      add(start + j, wave * env(t, SOFT ? 0.02 : 0.004, SOFT ? 0.22 : 0.1) * arpAmp);
    }
  }
}

// --- master: soft-clip + global fade in/out
const drive = SOFT ? 0.9 : 1.1;
const fadeIn = 0.25 * SR;
const fadeOut = 1.6 * SR;
for (let i = 0; i < N; i++) {
  let v = Math.tanh(buf[i] * drive);
  if (i < fadeIn) v *= i / fadeIn;
  if (i > N - fadeOut) v *= (N - i) / fadeOut;
  buf[i] = v * 0.9;
}

// --- write 16-bit mono WAV
const bytes = Buffer.alloc(44 + N * 2);
bytes.write("RIFF", 0);
bytes.writeUInt32LE(36 + N * 2, 4);
bytes.write("WAVE", 8);
bytes.write("fmt ", 12);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20); // PCM
bytes.writeUInt16LE(1, 22); // mono
bytes.writeUInt32LE(SR, 24);
bytes.writeUInt32LE(SR * 2, 28);
bytes.writeUInt16LE(2, 32);
bytes.writeUInt16LE(16, 34);
bytes.write("data", 36);
bytes.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  bytes.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * 32767))), 44 + i * 2);
}
writeFileSync(new URL(`../${OUT}`, import.meta.url), bytes);
console.log(`wrote ${OUT} (${DUR}s, ${SOFT ? "soft" : "energetic"}, ${(bytes.length / 1e6).toFixed(2)} MB)`);
