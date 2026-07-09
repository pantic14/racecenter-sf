// node --test src/lib/data/replay.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractTicks } from './archive.js';
import { createReplayer } from './replay.js';

const tele = (ts, riders) => JSON.stringify({ bind: 'telemetryCompetitor-2026', data: { TimeStamp: ts, Riders: riders } });

test('extractTicks keeps only telemetry and rolls skipped dt into the next tick', () => {
  const events = [
    { dt: 0, data: tele(100, [{ Bib: 1, secToFirstRider: 0 }]) },
    { dt: 500, data: '"a-bare-uuid-string"' }, // non-telemetry, non-object
    { dt: 500, data: JSON.stringify({ bind: 'video-1' }) }, // other bind, no Riders
    { dt: 300, data: tele(101, [{ Bib: 1, secToFirstRider: 0 }]) },
  ];
  const ticks = extractTicks(events, 'telemetryCompetitor-2026');
  assert.equal(ticks.length, 2);
  assert.equal(ticks[0].dt, 0);
  assert.equal(ticks[0].timeStamp, 100);
  // the two skipped events' dt (500+500) + this tick's 300 = 1300
  assert.equal(ticks[1].dt, 1300);
  assert.equal(ticks[1].timeStamp, 101);
});

test('extractTicks sorts riders by gap', () => {
  const events = [{ dt: 0, data: tele(1, [{ Bib: 9, secToFirstRider: 50 }, { Bib: 3, secToFirstRider: 0 }]) }];
  const [tick] = extractTicks(events);
  assert.deepEqual(tick.riders.map((r) => r.bib), [3, 9]);
});

// A manual scheduler: fire() runs the single pending timer with control over time.
function manualClock() {
  let pending = null;
  return {
    schedule: (fn, ms) => {
      pending = { fn, ms };
      return pending;
    },
    cancel: () => (pending = null),
    fire() {
      const p = pending;
      pending = null;
      p?.fn();
      return p?.ms;
    },
    get pendingMs() {
      return pending?.ms;
    },
  };
}

const mkTicks = (n) => Array.from({ length: n }, (_, k) => ({ dt: k === 0 ? 0 : 1000, timeStamp: k, riders: [] }));

test('replayer: play shows tick 0 immediately, then advances on each fire', () => {
  const clock = manualClock();
  const shown = [];
  const r = createReplayer({ ticks: mkTicks(3), onTick: (_t, i) => shown.push(i), ...clock });
  r.play();
  assert.deepEqual(shown, [0]); // opening tick shown at once
  assert.equal(clock.pendingMs, 1000);
  clock.fire();
  assert.deepEqual(shown, [0, 1]);
  clock.fire();
  assert.deepEqual(shown, [0, 1, 2]);
});

test('replayer: reaching the end stops and calls onEnd', () => {
  const clock = manualClock();
  const shown = [];
  let ended = 0;
  const r = createReplayer({ ticks: mkTicks(2), onTick: (_t, i) => shown.push(i), onEnd: () => ended++, ...clock });
  r.play(); // shows tick 0, schedules tick 1
  assert.equal(ended, 0);
  clock.fire(); // shows the last tick, then loop detects the end in the same turn
  assert.deepEqual(shown, [0, 1]);
  assert.equal(ended, 1);
  assert.equal(r.playing, false);
});

test('replayer: setSpeed reschedules the pending wait', () => {
  const clock = manualClock();
  const r = createReplayer({ ticks: mkTicks(3), onTick: () => {}, ...clock });
  r.play();
  assert.equal(clock.pendingMs, 1000);
  r.setSpeed(10);
  assert.equal(clock.pendingMs, 100); // 1000ms / 10x
});

test('replayer: seek jumps to an index and re-shows it', () => {
  const clock = manualClock();
  const shown = [];
  const r = createReplayer({ ticks: mkTicks(5), onTick: (_t, i) => shown.push(i), ...clock });
  r.seek(3);
  assert.deepEqual(shown, [3]);
  assert.equal(r.index, 3);
  r.seek(99); // clamped to last
  assert.equal(r.index, 4);
});
