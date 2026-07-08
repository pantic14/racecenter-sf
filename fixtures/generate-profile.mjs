// Generates public/fixtures/profile-synthetic.csv — a fake 160 km mountain
// stage in the racecenter profile CSV format:
//   header row, then lat;lon;alt;?;?;?;?;kmDone;kmToGo  (one point every ~30 m)
// Three climbs, the last one a summit finish.
// Run: node fixtures/generate-profile.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOTAL_KM = 160;
const STEP_KM = 0.03;

// climbs: [startKm, topKm, endKm, topAlt]
const CLIMBS = [
  [38, 52, 62, 950],
  [88, 104, 118, 1450],
  [138, 160, 160, 1850],
];
const BASE_ALT = 250;

function altitudeAt(km) {
  let alt = BASE_ALT + 60 * Math.sin(km / 9); // rolling terrain
  for (const [start, top, end, topAlt] of CLIMBS) {
    if (km >= start && km <= top) {
      const p = (km - start) / (top - start);
      alt = BASE_ALT + (topAlt - BASE_ALT) * (0.5 - 0.5 * Math.cos(p * Math.PI));
    } else if (km > top && km <= end) {
      const p = (km - top) / (end - top);
      alt = BASE_ALT + (topAlt - BASE_ALT) * (0.5 + 0.5 * Math.cos(p * Math.PI));
    }
  }
  return Math.round(alt);
}

let csv = 'latitude;longitude;altitude;c3;c4;c5;c6;kmDone;kmToGo\n';
for (let km = 0; km <= TOTAL_KM; km += STEP_KM) {
  const lat = (45.0 - km * 0.004).toFixed(6);
  const lon = (6.0 + km * 0.0025).toFixed(6);
  csv += `${lat};${lon};${altitudeAt(km)};0;0;0;0;${km.toFixed(2)};${(TOTAL_KM - km).toFixed(2)}\n`;
}

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fixtures');
mkdirSync(out, { recursive: true });
const file = join(out, 'profile-synthetic.csv');
writeFileSync(file, csv);
console.log(`wrote ${file} (${Math.round(TOTAL_KM / STEP_KM)} points, ${TOTAL_KM} km)`);
