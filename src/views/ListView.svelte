<script>
  import { race } from '../lib/state/race.svelte.js';
  import { prettyTime } from '../lib/util.js';
  import { gradeColor, vamColor } from '../lib/colors.js';
  import RiderChip from './RiderChip.svelte';

  /** VAM value or an em dash when unavailable. @param {number|null|undefined} v */
  const fmtVam = (v) => (v == null ? '—' : v);

  /**
   * Any VAM at all worth a row. Gating on vamInst alone hid the windowed values whenever
   * the instantaneous one was missing — which is exactly when they matter, since it drops
   * out on every flat metre while the 5 km average is still climbing.
   * @param {import('../lib/domain/grouping.js').Group} g
   */
  const hasVam = (g) => g.vamInst != null || g.vam500 != null || g.vam1k != null || g.vam5k != null;

  const shown = $derived(race.paused ? race.frozenGroups : race.groups);
  const pelotonId = $derived(
    shown.length ? shown.reduce((a, b) => (b.size > a.size ? b : a)).id : null,
  );

  function label(group, i) {
    if (group.id === pelotonId && group.size >= 20) return 'Peloton';
    if (i === 0) return 'Head of race';
    return `Group ${i + 1}`;
  }
</script>

{#if shown.length === 0}
  <p class="waiting">waiting for live data… (outside race hours the stream is silent)</p>
{:else}
  {#each shown as group, i (group.id)}
    <section class="group">
      <header>
        <span class="glabel">{label(group, i)}</span>
        <span class="gsize">{group.size} rider{group.size > 1 ? 's' : ''}</span>
        <span class="ggap">
          {#if group.gapToLeader > 0}
            +{prettyTime(group.gapToLeader)}
            {#if i > 0}<span class="gprev">(gap +{prettyTime(group.gapToPrevious)})</span>{/if}
            {#if race.trends[group.id] === 'up'}
              <span class="trend up" title="gap to the group ahead is opening">↗</span>
            {:else if race.trends[group.id] === 'down'}
              <span class="trend down" title="gap to the group ahead is closing">↘</span>
            {/if}
          {:else}
            at the front
          {/if}
        </span>
        {#if Number.isFinite(group.kph)}
          <span class="gkph">{Math.round(group.kph)} km/h</span>
        {/if}
        <span class="gkm">{group.kmToFinish.toFixed(1)} km to go</span>
        {#if group.relWind && group.windKph != null}
          <span class="gwind {group.relWind.kind}">
            <span
              class="warrow"
              style="transform: rotate({group.relWind.arrowDeg}deg)">↑</span
            >
            {Math.round(group.windKph)} km/h {group.relWind.label}
          </span>
        {/if}
        {#if group.tempC != null}
          <span class="gtemp">{Math.round(group.tempC)}°C</span>
        {/if}
        {#if group.gradient != null}
          <span class="ggrad" style="color: {gradeColor(group.gradient)}" title="road grade">
            {group.gradient > 0 ? '↗' : group.gradient < 0 ? '↘' : '→'}
            {group.gradient > 0 ? '+' : ''}{Math.round(group.gradient * 10) / 10}%
          </span>
        {/if}
        {#if hasVam(group)}
          <span class="gvam" title="VAM m/h (best rider) — inst · 500m · 1km · 5km">
            <span class="vlbl">VAM</span>
            <span style="color: {vamColor(group.vamInst)}">{fmtVam(group.vamInst)}</span>
            <span class="vsep">·</span>{fmtVam(group.vam500)}
            <span class="vsep">·</span>{fmtVam(group.vam1k)}
            <span class="vsep">·</span>{fmtVam(group.vam5k)}
          </span>
        {/if}
      </header>
      <div class="chips">
        {#each group.riders as rider (rider.bib)}
          <RiderChip {rider} />
        {/each}
      </div>
    </section>
  {/each}
{/if}

<style>
  .waiting {
    padding: 1rem;
    color: #666;
  }
  .group {
    border-bottom: 2px solid #ba4a19;
    padding: 6px 10px 8px;
  }
  header {
    display: flex;
    gap: 12px;
    align-items: baseline;
    font-size: 12px;
    color: #555;
    padding-bottom: 4px;
    flex-wrap: wrap;
  }
  .glabel {
    font-weight: 700;
    font-size: 13px;
    color: #222;
  }
  .ggap {
    font-variant-numeric: tabular-nums;
    color: #ba4a19;
    font-weight: 600;
  }
  .gprev {
    color: #999;
    font-weight: 400;
  }
  .trend {
    font-weight: 700;
  }
  .trend.up {
    color: #c62828;
  }
  .trend.down {
    color: #2e7d32;
  }
  .gkph {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: #1565c0;
  }
  .gwind {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .warrow {
    display: inline-block;
    line-height: 1;
    font-weight: 700;
  }
  .gwind.head {
    color: #c62828;
  }
  .gwind.tail {
    color: #2e7d32;
  }
  .gwind.cross-left,
  .gwind.cross-right {
    color: #b8860b;
  }
  .gtemp {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: #555;
  }
  .ggrad {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
  .gvam {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: #555;
  }
  .gvam .vlbl {
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 0.03em;
    color: #999;
  }
  .gvam .vsep {
    color: #bbb;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
</style>
