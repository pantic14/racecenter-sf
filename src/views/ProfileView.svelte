<script>
  import { race, getRoute } from '../lib/state/race.svelte.js';
  import { settings } from '../lib/state/settings.svelte.js';
  import { altitudeAt } from '../lib/domain/route.js';
  import { colorOf } from '../lib/colors.js';
  import { prettyTime } from '../lib/util.js';

  const W = 1000;
  const H = 300;
  const PAD = { top: 40, right: 24, bottom: 26, left: 42 };

  const groups = $derived(race.paused ? race.frozenGroups : race.groups);
  const route = $derived.by(() => {
    race.routeVersion; // dependency: re-read when the route is (re)loaded
    return getRoute();
  });

  // total distance: the route's own length when available (it can differ from
  // the official one), otherwise the stage's official length
  const totalKm = $derived(
    route ? route[route.length - 1].kmDone : (race.stage?.length ?? 100),
  );

  const altMin = $derived(route ? Math.min(...route.map((p) => p.alt)) : 0);
  const altMax = $derived(route ? Math.max(...route.map((p) => p.alt)) : 100);

  function x(km) {
    return PAD.left + ((W - PAD.left - PAD.right) * km) / totalKm;
  }
  function y(alt) {
    const span = Math.max(altMax - altMin, 100);
    return H - PAD.bottom - ((H - PAD.top - PAD.bottom) * (alt - altMin)) / span;
  }

  // ~400 points is plenty for a screen-wide polyline
  const line = $derived.by(() => {
    if (!route) return null;
    const step = Math.max(1, Math.floor(route.length / 400));
    const pts = [];
    for (let i = 0; i < route.length; i += step) pts.push(route[i]);
    if (pts[pts.length - 1] !== route[route.length - 1]) pts.push(route[route.length - 1]);
    return pts;
  });

  const areaPath = $derived.by(() => {
    if (!line) return '';
    let d = `M ${x(line[0].kmDone)} ${y(line[0].alt)}`;
    for (const p of line) d += ` L ${x(p.kmDone).toFixed(1)} ${y(p.alt).toFixed(1)}`;
    d += ` L ${x(totalKm)} ${H - PAD.bottom} L ${x(0)} ${H - PAD.bottom} Z`;
    return d;
  });

  // steep sections (avg gradient >= 4% over ~1 km) drawn on top in accent color
  const steepPaths = $derived.by(() => {
    if (!line) return [];
    const paths = [];
    let current = null;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const dKm = b.kmDone - a.kmDone;
      const grad = dKm > 0 ? (b.alt - a.alt) / (dKm * 1000) : 0;
      if (grad >= 0.04) {
        current ??= `M ${x(a.kmDone).toFixed(1)} ${y(a.alt).toFixed(1)}`;
        current += ` L ${x(b.kmDone).toFixed(1)} ${y(b.alt).toFixed(1)}`;
      } else if (current) {
        paths.push(current);
        current = null;
      }
    }
    if (current) paths.push(current);
    return paths;
  });

  const gridStep = $derived(totalKm > 120 ? 25 : totalKm > 40 ? 10 : 5);
  const gridKms = $derived.by(() => {
    const kms = [];
    for (let km = gridStep; km < totalKm; km += gridStep) kms.push(km);
    return kms;
  });

  function groupKmDone(group) {
    return Math.min(Math.max(totalKm - group.kmToFinish, 0), totalKm);
  }
  function groupY(group) {
    return route ? y(altitudeAt(route, groupKmDone(group))) : H - PAD.bottom;
  }
  function markerRadius(group) {
    return 5 + Math.sqrt(group.size) * 1.6;
  }
  // marker color: the dominant mark among the group's riders, else neutral
  function groupColor(group) {
    const counts = {};
    for (const r of group.riders) {
      const m = settings.marks[r.bib];
      if (m) counts[m] = (counts[m] ?? 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? colorOf(top[0], settings.myColor).bg : '#333';
  }
  function groupTitle(group, i) {
    const gap = group.gapToLeader > 0 ? `+${prettyTime(group.gapToLeader)}` : 'at the front';
    return `${i === 0 ? 'Head of race' : `Group ${i + 1}`} · ${group.size} riders · ${gap} · ${group.kmToFinish.toFixed(1)} km to go`;
  }
</script>

<div class="wrap">
  {#if !route}
    <p class="hint">
      No altimetry for this stage yet — showing a progress bar. Paste the stage's profile CSV URL
      in Settings → Stage profile when discovered.
    </p>
  {/if}

  <svg viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet">
    <!-- km grid, labeled as km TO GO (what you follow on TV) -->
    {#each gridKms as km}
      <line x1={x(km)} y1={PAD.top - 14} x2={x(km)} y2={H - PAD.bottom} class="grid" />
      <text x={x(km)} y={H - 8} class="gridlabel">{Math.round(totalKm - km)}</text>
    {/each}
    <text x={PAD.left} y={H - 8} class="gridlabel">km to go</text>
    <text x={x(totalKm)} y={H - 8} class="gridlabel finish">🏁 0</text>

    {#if route}
      <path d={areaPath} class="area" />
      {#each steepPaths as d}
        <path {d} class="steep" />
      {/each}
      <text x={PAD.left - 6} y={y(altMax) + 4} class="alt">{Math.round(altMax)}m</text>
      <text x={PAD.left - 6} y={y(altMin)} class="alt">{Math.round(altMin)}m</text>
    {:else}
      <line x1={x(0)} y1={H - PAD.bottom} x2={x(totalKm)} y2={H - PAD.bottom} class="flat" />
    {/if}

    <!-- rider groups -->
    {#each groups as group, i (group.id)}
      <g>
        <title>{groupTitle(group, i)}</title>
        <circle
          cx={x(groupKmDone(group))}
          cy={groupY(group) - markerRadius(group) - 3}
          r={markerRadius(group)}
          fill={groupColor(group)}
          class="marker"
        />
        <text
          x={x(groupKmDone(group))}
          y={groupY(group) - markerRadius(group) + 1}
          class="markerlabel"
        >{group.size}</text>
        {#if group.gapToLeader > 0}
          <text
            x={x(groupKmDone(group))}
            y={groupY(group) - markerRadius(group) * 2 - 8}
            class="gaplabel"
          >+{prettyTime(group.gapToLeader)}</text>
        {/if}
      </g>
    {/each}
  </svg>

  {#if groups.length === 0}
    <p class="hint">waiting for live data…</p>
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
  .area {
    fill: #e8e2d8;
    stroke: #a99;
    stroke-width: 1;
  }
  .steep {
    fill: none;
    stroke: #ba4a19;
    stroke-width: 2.5;
  }
  .flat {
    stroke: #bbb;
    stroke-width: 6;
    stroke-linecap: round;
  }
  .grid {
    stroke: #eee;
  }
  .gridlabel {
    font-size: 11px;
    fill: #999;
    text-anchor: middle;
  }
  .gridlabel.finish {
    font-weight: 700;
    fill: #333;
  }
  .alt {
    font-size: 10px;
    fill: #999;
    text-anchor: end;
  }
  .marker {
    stroke: #fff;
    stroke-width: 1.5;
    opacity: 0.92;
  }
  .markerlabel {
    font-size: 10px;
    fill: #fff;
    text-anchor: middle;
    font-weight: 700;
    pointer-events: none;
  }
  .gaplabel {
    font-size: 10px;
    fill: #555;
    text-anchor: middle;
    font-variant-numeric: tabular-nums;
  }
  .hint {
    font-size: 12px;
    color: #777;
    padding: 4px 2px;
  }
</style>
