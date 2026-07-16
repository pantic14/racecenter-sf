import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractWeather, wetAhead } from './weather.js';

/**
 * One checkpoint, shaped like ASO's. `sched` is the roadbook's expected pass; `meteoAt` is
 * when the reading was taken — the pair is what decides staleness.
 */
function cp(n, km, { code, desc, sched, meteoAt, temp = 20, place } = {}) {
  const c = { checkpoint: n, length: km, place: place ?? `P${n}` };
  if (sched) {
    c.lowSchedule = sched;
    c.middleSchedule = sched;
    c.highSchedule = sched;
  }
  if (code) {
    c.checkpointMeteo = {
      id: 1000 + n,
      currentWeatherIcon: code,
      currentWeatherDesc: desc ?? '',
      temperature: temp,
      windForce: 3,
      windDirection: 'NNE',
      meteoAt: meteoAt ?? '2026-07-15T14:00:04+02:00',
    };
  }
  return c;
}

/** The payload is an array holding one object keyed '0','1','2'… */
const payload = (list) => [Object.fromEntries(list.map((c, i) => [String(i), c]))];

test('extracts only the checkpoints that carry a reading, in ridden order', () => {
  const w = extractWeather(
    payload([
      cp(1, 0, { code: '10d', desc: 'légère pluie', sched: '14:00:00' }),
      cp(2, 50), // no meteo
      cp(3, 100, { code: '04d', desc: 'couvert', sched: '16:00:00', meteoAt: '2026-07-15T15:30:00+02:00' }),
      cp(4, 161.3), // last one sets the stage length
    ]),
  );
  assert.equal(w.length, 2);
  assert.deepEqual(w.map((p) => p.kmFromStart), [0, 100]);
  assert.deepEqual(w.map((p) => p.kmToGo), [161.3, 61.3]);
});

test('kmToGo is measured off the final checkpoint, not the first', () => {
  const w = extractWeather(payload([cp(1, 20, { code: '01d', sched: '14:00:00' }), cp(2, 80)]));
  assert.equal(w[0].kmToGo, 60);
});

test('rain, storm and snow are wet; cloud and sun are not', () => {
  const wet = ['09d', '10d', '11d', '13d'];
  const dry = ['01d', '02d', '03d', '04d', '50d'];
  for (const code of [...wet, ...dry]) {
    const w = extractWeather(payload([cp(1, 0, { code, sched: '14:00:00' }), cp(2, 100)]));
    assert.equal(w[0].isWet, wet.includes(code), `${code} wetness`);
  }
});

test('every icon family maps to an emoji, and an unknown one degrades quietly', () => {
  for (const code of ['01d', '02n', '03d', '04n', '09d', '10d', '11n', '13d', '50d']) {
    const w = extractWeather(payload([cp(1, 0, { code, sched: '14:00:00' }), cp(2, 100)]));
    assert.notEqual(w[0].emoji, '·', `${code} should have an emoji`);
  }
  const odd = extractWeather(payload([cp(1, 0, { code: '99x', sched: '14:00:00' }), cp(2, 100)]));
  assert.equal(odd[0].emoji, '·');
  assert.equal(odd[0].isWet, false);
});

test('a reading taken before the race is due is faithful', () => {
  const w = extractWeather(
    payload([
      cp(1, 27.9, { code: '10d', sched: '14:42:00', meteoAt: '2026-07-15T14:30:05+02:00' }),
      cp(2, 161.3),
    ]),
  );
  assert.equal(w[0].stale, false);
});

test('a reading long after the race is due is stale — the finish case', () => {
  // Nevers, 2026-07-15: read at 19:30 for a race due at 17:40. Nothing to do with the race.
  const w = extractWeather(
    payload([
      cp(1, 161.3, { code: '04d', sched: '17:40:00', meteoAt: '2026-07-15T19:30:06+02:00' }),
      cp(2, 161.3),
    ]),
  );
  assert.equal(w[0].stale, true);
});

test('a reading inside the 30 min margin still counts — the roadbook is an estimate', () => {
  const at = (t) =>
    extractWeather(payload([cp(1, 10, { code: '10d', sched: '15:00:00', meteoAt: t }), cp(2, 100)]))[0].stale;
  assert.equal(at('2026-07-15T15:29:00+02:00'), false, 'just inside');
  assert.equal(at('2026-07-15T15:31:00+02:00'), true, 'just outside');
});

test('staleness is judged in the race timezone, not the viewer local one', () => {
  // Same wall-clock strings, different offsets: parsing them as local time would make the
  // verdict depend on where the user happens to be sitting.
  const w = extractWeather(
    payload([cp(1, 10, { code: '10d', sched: '15:00:00', meteoAt: '2026-07-15T15:10:00+02:00' }), cp(2, 100)]),
  );
  assert.equal(w[0].stale, false);
  assert.equal(new Date(w[0].dueAt).toISOString(), '2026-07-15T13:00:00.000Z');
});

test('the start listed twice keeps one point', () => {
  const w = extractWeather(
    payload([
      cp(1, 0, { code: '10d', sched: '13:50:00', place: 'VICHY' }),
      cp(2, 0, { code: '10d', sched: '14:05:00', place: 'VICHY' }),
      cp(3, 161.3),
    ]),
  );
  assert.equal(w.length, 1);
  assert.equal(w[0].place, 'VICHY');
});

test('a checkpoint with no schedule is never called stale — nothing to compare against', () => {
  const w = extractWeather(payload([cp(1, 10, { code: '10d', meteoAt: '2026-07-15T23:00:00+02:00' }), cp(2, 100)]));
  assert.equal(w[0].dueAt, null);
  assert.equal(w[0].stale, false);
});

test('carries ASO’s own words and figures through untouched', () => {
  const w = extractWeather(
    payload([cp(1, 0, { code: '10d', desc: 'pluie modérée', sched: '14:00:00', temp: 34.4 }), cp(2, 100)]),
  );
  assert.equal(w[0].desc, 'pluie modérée');
  assert.equal(w[0].tempC, 34.4);
  assert.equal(w[0].windForce, 3);
  assert.equal(w[0].windDir, 'NNE');
});

test('empty, malformed and meteo-less payloads give an empty list, never a throw', () => {
  assert.deepEqual(extractWeather(null), []);
  assert.deepEqual(extractWeather([]), []);
  assert.deepEqual(extractWeather([{}]), []);
  assert.deepEqual(extractWeather(payload([cp(1, 0), cp(2, 100)])), []);
  assert.deepEqual(extractWeather(payload([cp(1, 0, { code: '10d', sched: '14:00:00' })])), []); // stageKm = 0
});

test('wetAhead finds the nearest wet point up the road, ignoring dry and passed ones', () => {
  const w = extractWeather(
    payload([
      cp(1, 20, { code: '10d', sched: '14:00:00' }), // kmToGo 80 — behind
      cp(2, 60, { code: '01d', sched: '15:00:00' }), // kmToGo 40 — dry
      cp(3, 70, { code: '09d', sched: '15:30:00' }), // kmToGo 30 — nearest wet ahead
      cp(4, 90, { code: '11d', sched: '16:00:00' }), // kmToGo 10 — wet but further
      cp(5, 100),
    ]),
  );
  assert.equal(wetAhead(w, 50).kmToGo, 30);
  assert.equal(wetAhead(w, 20).kmToGo, 10);
  assert.equal(wetAhead(w, 5), null, 'nothing left ahead');
  assert.equal(wetAhead(w, null), null);
});

test('wetAhead ignores stale readings — they describe no moment of the race', () => {
  const w = extractWeather(
    payload([
      cp(1, 50, { code: '10d', sched: '15:00:00', meteoAt: '2026-07-15T18:00:00+02:00' }), // stale
      cp(2, 100),
    ]),
  );
  assert.equal(w[0].stale, true);
  assert.equal(wetAhead(w, 80), null);
});
