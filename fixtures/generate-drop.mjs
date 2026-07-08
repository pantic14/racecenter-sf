// Generates public/fixtures/synthetic-drop.json — the alert-testing scenario:
//   t=60   bib 1 (mark him as favorite!) starts drifting off the peloton
//   t=120  the peloton starts closing on the 5-man break (60s -> 0)
//   t~228  the break is caught
// Expected alerts: 1 drop (bib 1), gap closing (break vs peloton) and gap
// opening (peloton vs bib 1), and 1 break-caught. Run: node fixtures/generate-drop.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const YEAR = new Date().getUTCFullYear();
const BIND = `telemetryCompetitor-${YEAR}`;
const TICKS = 300;
const BASE_TS = Math.floor(Date.now() / 1000) - TICKS;

const bibs = [];
for (let t = 0; t < 22; t++) for (let n = 1; n <= 8; n++) bibs.push(t * 10 + n);

const BREAK = [15, 27, 44, 101, 156];
const FAVORITE = 1;

const SPEED_KPH = 45;
const KM_PER_SEC = SPEED_KPH / 3600;
const START_KM_TO_GO = 60;

// break leads by 60s; from t=120 the peloton closes at 0.5 s/s (caught ~t=228)
function pelotonGap(t) {
  return t < 120 ? 60 : Math.max(0, 60 - 0.5 * (t - 120));
}

function gapOf(bib, t, idx) {
  const jitter = idx % 3;
  if (BREAK.includes(bib)) return jitter;
  if (bib === FAVORITE && t >= 60) {
    return pelotonGap(t) + Math.min(1.5 * (t - 60), 45) + jitter;
  }
  return pelotonGap(t) + jitter;
}

const events = [];
for (let t = 0; t < TICKS; t++) {
  const leaderKm = START_KM_TO_GO - t * KM_PER_SEC;
  const wx = {
    Course: Math.round(135 + 10 * Math.sin(t / 50)),
    RiderWindDir: (60 + t) % 360,
    kphWind: 12 + Math.round(6 * Math.sin(t / 30)),
    degC: 23 + Math.round(3 * Math.sin(t / 60)),
  };
  const Riders = bibs.map((bib) => {
    const idx = BREAK.includes(bib) ? BREAK.indexOf(bib) : bib % 7;
    const gap = gapOf(bib, t, idx);
    return {
      Bib: bib,
      kmToFinish: Number((leaderKm + gap * KM_PER_SEC).toFixed(3)),
      secToFirstRider: Math.round(gap),
      kph: SPEED_KPH + ((bib * 7 + t) % 5) - 2,
      kphAvg: 43.2,
      Latitude: Number((45.0 - (START_KM_TO_GO - leaderKm) * 0.008).toFixed(5)),
      Longitude: Number((6.0 + (START_KM_TO_GO - leaderKm) * 0.005).toFixed(5)),
      mAlt: 300,
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
const file = join(out, 'synthetic-drop.json');
writeFileSync(file, JSON.stringify(events));
console.log(`wrote ${file} (${events.length} ticks)`);
