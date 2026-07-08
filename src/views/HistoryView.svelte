<script>
  import { untrack } from 'svelte';
  import { race } from '../lib/state/race.svelte.js';
  import { getStageHistory, clearStage } from '../lib/storage/tickLog.js';
  import { prettyTime } from '../lib/util.js';

  const W = 1000;
  const H = 340;
  const PAD = { top: 16, right: 130, bottom: 30, left: 52 };
  const BUCKET_S = 10;
  const PALETTE = ['#1976d2', '#e53935', '#2e7d32', '#f9a825', '#6a1b9a', '#00838f', '#ba4a19', '#546e7a'];

  /** raw accumulated data: group id -> Map<bucketTime, {gap, size}> */
  let raw = new Map();
  let loadedKey = '';
  let chartVersion = $state(0);
  let loading = $state(false);
  let hover = $state(null); // {t, x}

  function addRow(t, groups) {
    const bucket = Math.floor(t / BUCKET_S) * BUCKET_S;
    for (const g of groups) {
      let m = raw.get(g.id);
      if (!m) {
        m = new Map();
        raw.set(g.id, m);
      }
      m.set(bucket, { gap: g.gap ?? g.gapToLeader, size: g.size });
    }
  }

  async function load() {
    if (!race.historyKey || loadedKey === race.historyKey) return;
    loading = true;
    try {
      raw = new Map();
      const rows = await getStageHistory(race.historyKey);
      for (const row of rows) addRow(row.t, row.groups);
      loadedKey = race.historyKey;
      chartVersion++;
    } finally {
      loading = false;
    }
  }
  $effect(() => {
    load();
  });

  // live-append current groups while the tab is open
  $effect(() => {
    const tick = race.tick;
    if (!tick || loadedKey !== race.historyKey) return;
    // untrack the write: `chartVersion++` reads-then-writes chartVersion, which
    // would make this effect depend on the state it mutates → infinite loop.
    // Re-running is driven by race.tick changing (a new tick per second).
    untrack(() => {
      addRow(tick.timeStamp, race.groups);
      chartVersion++;
    });
  });

  async function clearHistory() {
    await clearStage(race.historyKey);
    raw = new Map();
    loadedKey = '';
    chartVersion++;
    load();
  }

  const chart = $derived.by(() => {
    chartVersion;
    let t0 = Infinity;
    let t1 = -Infinity;
    let maxGap = 60;
    const series = [];
    let colorIdx = 0;
    let lastBucketAll = -Infinity;
    for (const m of raw.values()) {
      for (const b of m.keys()) if (b > lastBucketAll) lastBucketAll = b;
    }
    for (const [id, m] of raw) {
      const points = [...m.entries()].sort((a, b) => a[0] - b[0]);
      const aliveNow = points[points.length - 1]?.[0] >= lastBucketAll - BUCKET_S;
      if (points.length < 6 && !aliveNow) continue; // skip ephemeral splinters
      const pts = points.map(([t, v]) => ({ t, gap: v.gap, size: v.size }));
      t0 = Math.min(t0, pts[0].t);
      t1 = Math.max(t1, pts[pts.length - 1].t);
      for (const p of pts) maxGap = Math.max(maxGap, p.gap);
      series.push({
        id,
        color: PALETTE[colorIdx++ % PALETTE.length],
        pts,
        last: pts[pts.length - 1],
        aliveNow,
      });
    }
    series.sort((a, b) => a.last.gap - b.last.gap);
    return { series, t0, t1: Math.max(t1, t0 + 120), maxGap: maxGap * 1.08 };
  });

  function x(t) {
    return PAD.left + ((W - PAD.left - PAD.right) * (t - chart.t0)) / (chart.t1 - chart.t0);
  }
  function y(gap) {
    return PAD.top + ((H - PAD.top - PAD.bottom) * gap) / chart.maxGap;
  }
  function pathOf(s) {
    return s.pts.map((p, i) => `${i ? 'L' : 'M'} ${x(p.t).toFixed(1)} ${y(p.gap).toFixed(1)}`).join(' ');
  }

  const yTicks = $derived.by(() => {
    const steps = [15, 30, 60, 120, 300, 600, 1200];
    const step = steps.find((s) => chart.maxGap / s <= 7) ?? 1800;
    const ticks = [];
    for (let g = 0; g <= chart.maxGap; g += step) ticks.push(g);
    return ticks;
  });
  const xTicks = $derived.by(() => {
    const span = chart.t1 - chart.t0;
    const step = span > 7200 ? 1800 : span > 1800 ? 600 : 60;
    const ticks = [];
    for (let t = Math.ceil(chart.t0 / step) * step; t <= chart.t1; t += step) ticks.push(t);
    return ticks;
  });

  function clock(t) {
    return new Date(t * 1000).toTimeString().substring(0, 5);
  }

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    if (px < PAD.left || px > W - PAD.right) {
      hover = null;
      return;
    }
    const t = chart.t0 + ((px - PAD.left) / (W - PAD.left - PAD.right)) * (chart.t1 - chart.t0);
    hover = { t: Math.round(t / BUCKET_S) * BUCKET_S, x: px };
  }

  function gapAt(s, t) {
    const p = s.pts.find((p) => p.t === t);
    return p ? p.gap : null;
  }
</script>

<div class="wrap">
  {#if chart.series.length === 0}
    <p class="hint">{loading ? 'loading…' : 'no gap history for this stage yet — it records automatically while data flows'}</p>
  {:else}
    <svg viewBox="0 0 {W} {H}" onmousemove={onMove} onmouseleave={() => (hover = null)} role="img">
      {#each yTicks as g}
        <line x1={PAD.left} y1={y(g)} x2={W - PAD.right} y2={y(g)} class="grid" />
        <text x={PAD.left - 6} y={y(g) + 4} class="ylabel">+{prettyTime(g)}</text>
      {/each}
      {#each xTicks as t}
        <line x1={x(t)} y1={PAD.top} x2={x(t)} y2={H - PAD.bottom} class="grid" />
        <text x={x(t)} y={H - 10} class="xlabel">{clock(t)}</text>
      {/each}

      {#each chart.series as s (s.id)}
        <path d={pathOf(s)} class="line" style="stroke:{s.color}" opacity={s.aliveNow ? 1 : 0.35} />
        <text x={W - PAD.right + 8} y={y(s.last.gap) + 4} class="legend" style="fill:{s.color}">
          {s.last.size} rider{s.last.size > 1 ? 's' : ''} · +{prettyTime(s.last.gap)}
        </text>
      {/each}

      {#if hover}
        <line x1={hover.x} y1={PAD.top} x2={hover.x} y2={H - PAD.bottom} class="cursor" />
        <g transform="translate({Math.min(hover.x + 8, W - PAD.right - 150)}, {PAD.top + 4})">
          <rect width="150" height={16 + chart.series.length * 15} class="tipbox" />
          <text x="6" y="13" class="tip">{clock(hover.t)}</text>
          {#each chart.series as s, i (s.id)}
            {@const g = gapAt(s, hover.t)}
            <text x="6" y={28 + i * 15} class="tip" style="fill:{s.color}">
              {s.last.size}r: {g != null ? '+' + prettyTime(g) : '—'}
            </text>
          {/each}
        </g>
      {/if}
    </svg>
    <div class="footer">
      <span class="hint">gap to the head of the race, one line per group (faded = no longer exists)</span>
      <button onclick={clearHistory}>Clear this stage's history</button>
    </div>
  {/if}
</div>

<style>
  .wrap {
    padding: 8px 10px;
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
    background: #fff;
    border: 1px solid #eee;
    border-radius: 6px;
  }
  .grid {
    stroke: #f0f0ee;
  }
  .line {
    fill: none;
    stroke-width: 2;
  }
  .ylabel {
    font-size: 11px;
    fill: #999;
    text-anchor: end;
    font-variant-numeric: tabular-nums;
  }
  .xlabel {
    font-size: 11px;
    fill: #999;
    text-anchor: middle;
  }
  .legend {
    font-size: 11px;
    font-weight: 600;
  }
  .cursor {
    stroke: #bbb;
    stroke-dasharray: 3 3;
  }
  .tipbox {
    fill: #fff;
    stroke: #ccc;
    rx: 4;
    opacity: 0.95;
  }
  .tip {
    font-size: 11px;
    fill: #444;
    font-variant-numeric: tabular-nums;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 6px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .hint {
    font-size: 12px;
    color: #777;
  }
  button {
    font-family: inherit;
    border: 1px solid #ba4a19;
    background: #fff;
    color: #ba4a19;
    border-radius: 4px;
    padding: 3px 10px;
    cursor: pointer;
  }
</style>
