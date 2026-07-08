// Generates public/fixtures/synthetic-basic.json — ~5 min of fake telemetry at 1 Hz.
// Scenario: 5-man break ~3 min ahead, 3-man chase falling back until caught,
// two riders drifting off the peloton, one rider crawling at 3 km/h after a crash.
// Run: node fixtures/generate-synthetic.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const YEAR = new Date().getUTCFullYear();
const BIND = `telemetryCompetitor-${YEAR}`;
const TICKS = 300;
const BASE_TS = Math.floor(Date.now() / 1000) - TICKS;

// 22 teams x 8 riders, real TdF numbering (team k -> 10k+1 .. 10k+8)
const bibs = [];
for (let t = 0; t < 22; t++) for (let n = 1; n <= 8; n++) bibs.push(t * 10 + n);

const BREAK = [15, 27, 44, 101, 156];
const CHASE = [61, 62, 63];
const DRIFTERS = [78, 122]; // fall off the peloton from t=120
const CRASHED = 47; // 3 km/h from t=90

const SPEED_KPH = 45;
const KM_PER_SEC = SPEED_KPH / 3600;
const START_KM_TO_GO = 60;

function gapOf(bib, t, idxInGroup) {
  const jitter = idxInGroup % 3; // < min_gap, keeps groups intact
  if (BREAK.includes(bib)) return jitter;
  if (CHASE.includes(bib)) {
    // 40 s behind, drifting back until swallowed by the peloton (~t=250)
    return Math.min(40 + t * 0.52, pelotonGap(t)) + jitter;
  }
  if (bib === CRASHED && t >= 90) return pelotonGap(90) + (t - 90) * 3 + jitter;
  if (DRIFTERS.includes(bib) && t >= 120) return pelotonGap(t) + (t - 120) * 1 + jitter;
  return pelotonGap(t) + jitter;
}

// break's lead melts slowly: 180 s -> 160 s over 5 min
function pelotonGap(t) {
  return 180 - (20 * t) / TICKS;
}

// Weather rides inside the telemetry feed (Course/RiderWindDir/kphWind/degC), so
// mock/replay show real feed weather. Rotate the wind bearing over the 5 min so the
// arrow and 8-way label visibly sweep head->cross->tail during dev.
function weatherAt(t) {
  return {
    Course: Math.round(135 + 10 * Math.sin(t / 50)), // ~SE travel heading
    RiderWindDir: (60 + t) % 360, // absolute "from" bearing, slowly rotating
    kphWind: 12 + Math.round(6 * Math.sin(t / 30)),
    degC: 23 + Math.round(3 * Math.sin(t / 60)),
  };
}

const events = [];
for (let t = 0; t < TICKS; t++) {
  const leaderKm = START_KM_TO_GO - t * KM_PER_SEC;
  const wx = weatherAt(t);
  const Riders = bibs.map((bib) => {
    const idx = BREAK.includes(bib)
      ? BREAK.indexOf(bib)
      : CHASE.includes(bib)
        ? CHASE.indexOf(bib)
        : bib % 7;
    const gap = gapOf(bib, t, idx);
    const kph = bib === CRASHED && t >= 90 && t < 150 ? 3 : SPEED_KPH + ((bib * 7 + t) % 5) - 2;
    return {
      Bib: bib,
      kmToFinish: Number((leaderKm + gap * KM_PER_SEC).toFixed(3)),
      secToFirstRider: Math.round(gap),
      kph,
      kphAvg: 43.2,
      Latitude: Number((45.0 - (START_KM_TO_GO - leaderKm) * 0.008).toFixed(5)),
      Longitude: Number((6.0 + (START_KM_TO_GO - leaderKm) * 0.005).toFixed(5)),
      mAlt: 300 + Math.round(20 * Math.sin(t / 40)),
      ...wx,
    };
  });
  events.push({
    dt: t === 0 ? 0 : 1000,
    data: JSON.stringify({ bind: BIND, data: { TimeStamp: BASE_TS + t, Riders } }),
  });
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fixtures');
mkdirSync(out, { recursive: true });
const file = join(out, 'synthetic-basic.json');
writeFileSync(file, JSON.stringify(events));
console.log(`wrote ${file} (${events.length} ticks, ${bibs.length} riders)`);
