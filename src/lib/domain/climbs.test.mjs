import test from 'node:test';
import assert from 'node:assert/strict';
import { extractClimbs, createClimbTracker } from './climbs.js';

/**
 * Build a /api/checkpoint-<year>-<stage> payload: an ARRAY holding one object keyed
 * '0','1',… Each entry is [kmFromStart, summits[]].
 */
function makeCheckpoints(entries) {
  const map = {};
  entries.forEach(([length, summits], i) => {
    map[String(i)] = { checkpoint: i + 1, length, checkpointTypes: [], checkpointSummits: summits ?? [] };
  });
  return [map];
}

const summit = (id, code, name, lengthM, state, altitude = 1000) => ({
  id,
  code,
  number: id,
  length: lengthM,
  state,
  summit: { name, altitude },
});

test('reads a climb straight off ASO: summit from cumulative distance, foot from its length', () => {
  // Tourmalet on 2026 stage 6: stage 186.17 km, summit checkpoint at 147.73, climb 17.1 km.
  const cps = makeCheckpoints([
    [0, []],
    [147.73, [summit(4290, 'H', 'Col du Tourmalet (2 115 m)', 17100, '7.3', 2115)]],
    [186.17, []],
  ]);
  const [c] = extractClimbs(cps);
  assert.equal(c.name, 'Col du Tourmalet (2 115 m)');
  assert.equal(c.cat, 'HC');
  assert.equal(c.lengthKm, 17.1);
  assert.equal(c.avgPct, 7.3);
  assert.equal(c.summitKmToGo, 38.44);
  assert.equal(c.footKmToGo, 55.54);
  assert.equal(c.summitAlt, 2115);
  assert.equal(c.gain, 1248); // implied by length × gradient
  assert.equal(c.isFinish, false);
});

test('a summit ON the finish line is marked as one', () => {
  const cps = makeCheckpoints([
    [0, []],
    [186.17, [summit(4291, '2', 'GAVARNIE-GÈDRE (1 380 m)', 18700, '3.7', 1380)]],
  ]);
  const [c] = extractClimbs(cps);
  assert.equal(c.isFinish, true);
  assert.equal(c.summitKmToGo, 0);
  assert.equal(c.footKmToGo, 18.7);
  assert.equal(c.cat, '2', 'ASO categorises summit finishes; nothing is inferred here');
});

test('maps every category code, and refuses to invent one', () => {
  const cps = makeCheckpoints([
    [10, [summit(1, '4', 'Cuatro', 1000, '5')]],
    [20, [summit(2, '3', 'Tres', 1000, '5')]],
    [30, [summit(3, '2', 'Dos', 1000, '5')]],
    [40, [summit(4, '1', 'Uno', 1000, '5')]],
    [50, [summit(5, 'H', 'Hors', 1000, '5')]],
    [60, [summit(6, 'X', 'Sin categoría', 1000, '5')]],
    [100, []],
  ]);
  assert.deepEqual(
    extractClimbs(cps).map((c) => c.cat),
    ['4', '3', '2', '1', 'HC', null], // ridden order
  );
});

test('orders climbs as they are ridden and keeps ASO ids stable', () => {
  const cps = makeCheckpoints([
    [120, [summit(4287, '1', 'Segundo', 5000, '6')]],
    [40, [summit(4286, '4', 'Primero', 2000, '5')]],
    [160, []],
  ]);
  const climbs = extractClimbs(cps);
  assert.deepEqual(climbs.map((c) => c.name), ['Primero', 'Segundo']);
  assert.deepEqual(climbs.map((c) => c.id), ['4286', '4287']);
  assert.ok(climbs[0].summitKmToGo > climbs[1].summitKmToGo);
});

test('survives a payload with no climbs, or no payload at all', () => {
  assert.deepEqual(extractClimbs(makeCheckpoints([[0, []], [100, []]])), []);
  assert.deepEqual(extractClimbs(null), []);
  assert.deepEqual(extractClimbs([]), []);
  assert.deepEqual(extractClimbs([{}]), []);
  assert.deepEqual(extractClimbs(makeCheckpoints([[0, []]])), []); // stage length 0
});

// ---- ascent timing ----

const CLIMB = {
  id: 'c1',
  name: 'Test',
  cat: '1',
  footKmToGo: 20,
  summitKmToGo: 10,
  lengthKm: 10,
  gain: 700,
  avgPct: 7,
  summitAlt: 1000,
  isFinish: false,
};

/**
 * Ticks for riders [{bib, kph}] riding a shared 6 s clock from `from` km-to-go until all
 * are past `to`. One timeline, so riders of different speeds stay on the same frames.
 */
function ride(riders, from, to, { stepS = 6, t0 = 1000 } = {}) {
  const ticks = [];
  const pos = new Map(riders.map((r) => [r.bib, from]));
  let t = t0;
  for (let guard = 0; guard < 5000; guard++) {
    ticks.push({
      timeStamp: t,
      riders: riders.map((r) => ({ bib: r.bib, kmToFinish: Math.round(pos.get(r.bib) * 1000) / 1000 })),
    });
    if ([...pos.values()].every((km) => km <= to)) break;
    for (const r of riders) pos.set(r.bib, Math.max(to, pos.get(r.bib) - (r.kph * stepS) / 3600));
    t += stepS;
  }
  return ticks;
}

test('times a rider from foot to summit and derives VAM', () => {
  const tr = createClimbTracker();
  // 30 km/h over the 10 km climb → 20 min, so 700 m of ascent is a VAM of 2100
  for (const tick of ride([{ bib: 1, kph: 30 }], 25, 5)) tr.update(tick, [CLIMB]);
  const [r] = tr.times(CLIMB);
  assert.equal(r.bib, 1);
  assert.ok(Math.abs(r.secs - 1200) < 3, `secs ${r.secs}`);
  assert.ok(Math.abs(r.vam - 2100) < 10, `vam ${r.vam}`);
  assert.ok(Math.abs(r.kph - 30) < 0.2, `kph ${r.kph}`);
});

test('a rider still on the climb is not timed yet', () => {
  const tr = createClimbTracker();
  for (const tick of ride([{ bib: 1, kph: 30 }], 25, 15)) tr.update(tick, [CLIMB]);
  assert.deepEqual(tr.times(CLIMB), []);
});

test('a rider who joined the feed mid-climb is left out, not guessed at', () => {
  const tr = createClimbTracker();
  for (const tick of ride([{ bib: 1, kph: 30 }], 15, 5)) tr.update(tick, [CLIMB]); // never crossed the foot
  assert.deepEqual(tr.times(CLIMB), []);
});

test('ignores a feed resync that teleports a rider across the climb', () => {
  const tr = createClimbTracker();
  // One 6 s frame jumping 25 → 5 km would otherwise "cross" foot and summit at once and
  // report an ascent of seconds.
  tr.update({ timeStamp: 1000, riders: [{ bib: 1, kmToFinish: 25 }] }, [CLIMB]);
  tr.update({ timeStamp: 1006, riders: [{ bib: 1, kmToFinish: 5 }] }, [CLIMB]);
  assert.deepEqual(tr.times(CLIMB), []);
});

test('does not time across a gap in the feed', () => {
  const tr = createClimbTracker();
  // Frames either side of the foot are 5 minutes apart: the crossing is unknowable.
  tr.update({ timeStamp: 1000, riders: [{ bib: 1, kmToFinish: 21 }] }, [CLIMB]);
  tr.update({ timeStamp: 1300, riders: [{ bib: 1, kmToFinish: 19 }] }, [CLIMB]);
  for (const tick of ride([{ bib: 1, kph: 30 }], 19, 5, { t0: 1330 })) tr.update(tick, [CLIMB]);
  assert.deepEqual(tr.times(CLIMB), [], 'foot was never established, so no time');
});

test('ranks riders fastest first', () => {
  const tr = createClimbTracker();
  for (const tick of ride([{ bib: 2, kph: 22 }, { bib: 3, kph: 30 }], 25, 5)) tr.update(tick, [CLIMB]);
  const times = tr.times(CLIMB);
  assert.deepEqual(times.map((t) => t.bib), [3, 2]);
  assert.ok(times[0].secs < times[1].secs);
  assert.ok(times[0].vam > times[1].vam, 'the faster rider has the higher VAM');
});

test('times a summit finish, where kmToFinish never reaches 0', () => {
  const tr = createClimbTracker();
  const finish = { ...CLIMB, id: 'f1', summitKmToGo: 0, footKmToGo: 10, lengthKm: 10, isFinish: true };
  // The feed stops at 0.02 km — a strict "cross 0" would never fire.
  for (const tick of ride([{ bib: 1, kph: 25 }], 12, 0.02)) tr.update(tick, [finish]);
  const [r] = tr.times(finish);
  assert.ok(r, 'summit finish timed despite kmToFinish never hitting 0');
  assert.ok(r.secs > 0);
});
