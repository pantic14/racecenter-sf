// Wrap a synthetic fixture into a valid replay recording (.json.gz) for developing
// the replay feature without the published data repo — the same format data-repo's
// recorder produces, so ReplayBar's local-file fallback can load it.
//
// Usage: node fixtures/make-recording.mjs [synthetic-basic|synthetic-drop]
// Output: public/fixtures/<name>.recording.json.gz  (gitignored)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, '..', 'public', 'fixtures');

const name = process.argv[2] || 'synthetic-basic';

/** @type {{dt:number, data:string}[]} */
const events = JSON.parse(readFileSync(join(FIX, `${name}.json`), 'utf8'));
if (!events.length) throw new Error(`fixture '${name}' is empty`);

// Derive the telemetry bind / year and the bib list from the first telemetry tick.
let bind = '';
let bibs = [];
for (const ev of events) {
  let d;
  try {
    d = JSON.parse(ev.data);
  } catch {
    continue;
  }
  if (Array.isArray(d?.data?.Riders)) {
    bind = d.bind;
    bibs = d.data.Riders.map((r) => Number(r.Bib));
    break;
  }
}
if (!bind) throw new Error(`no telemetry event found in '${name}'`);
const year = Number(String(bind).split('-').pop()) || new Date().getUTCFullYear();
const date = `${year}-07-05`;

// A distinct colored jersey per team so the maillots are visible in dev.
const PALETTE = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff', '#9a6324', '#800000', '#aaffc3', '#808000', '#000075', '#a9a9a9', '#e6beff', '#ffd8b1', '#00a5cf', '#c71585', '#2f4f4f'];
const jerseySvg = (color) =>
  'data:image/svg+xml,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" rx="4" fill="${color}"/></svg>`);

const teamNum = (bib) => Math.floor(bib / 10); // t*10+n -> t
const teamIds = [...new Set(bibs.map(teamNum))].sort((a, b) => a - b);

const teams = teamIds.map((id) => ({
  _id: `team${id}`,
  name: `Team ${id}`,
  jersey_sm: jerseySvg(PALETTE[id % PALETTE.length]),
}));

const riders = bibs.map((bib) => {
  const t = teamNum(bib);
  return {
    bib,
    firstname: 'Rider',
    lastname: `#${bib}`,
    lastnameshort: `R${bib}`,
    team_name: `Team ${t}`,
    $team: `x:team${t}`, // views link rider->team via $team.split(':')[1]
  };
});

const stages = {
  [date]: {
    date,
    stage: 5,
    length: 60, // matches the synthetic telemetry's start km-to-go
    arrivalCity: { label: 'Synthetic City' },
    name: 'Stage 5 - Synthetic City',
  },
};

const recording = {
  version: 1,
  meta: { date, year, recordedAt: new Date().toISOString(), synthetic: name },
  rest: { riders, teams, stages },
  events,
};

const gz = gzipSync(Buffer.from(JSON.stringify(recording)), { level: 9 });
const outFile = join(FIX, `${name}.recording.json.gz`);
writeFileSync(outFile, gz);
console.log(
  `wrote ${outFile} (${(gz.length / 1024).toFixed(0)} KB, ${events.length} events, ${riders.length} riders, ${teams.length} teams)`,
);
