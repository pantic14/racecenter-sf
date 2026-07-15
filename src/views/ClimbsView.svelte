<script>
  import { race, climbTimes } from '../lib/state/race.svelte.js';
  import { settings } from '../lib/state/settings.svelte.js';
  import { ui } from '../lib/state/ui.svelte.js';
  import { colorOf, vamColor } from '../lib/colors.js';

  /** How many riders a climb's classification shows before it is folded away. */
  const TOP_N = 10;

  /** @type {Record<string, boolean>} climb id -> expanded beyond TOP_N */
  let expanded = $state({});

  const leaderKm = $derived(race.tick?.riders?.[0]?.kmToFinish ?? null);

  /**
   * Climbs with their live classification. Reads race.tick so it recomputes every frame:
   * the tracker itself is plain (non-reactive) state, deliberately, like the route.
   */
  const rows = $derived.by(() => {
    race.tick; // dependency: re-time on every frame
    return race.climbs.map((climb) => {
      const times = climbTimes(climb);
      const km = leaderKm;
      const state =
        km == null ? 'ahead'
        : km > climb.footKmToGo ? 'ahead'
        : km > climb.summitKmToGo ? 'on'
        : 'done';
      return { climb, times, state };
    });
  });

  function riderName(bib) {
    const r = race.riders[bib];
    return `${r?.lastnameshort ?? r?.lastname ?? ''}`.trim() || `#${bib}`;
  }
  function teamOf(bib) {
    const id = race.riders[bib]?.$team?.split(':')[1];
    return (id && race.teams.find((t) => t._id === id)?.name) || '';
  }
  /** Mark colour for a bib, or '' when unmarked. @param {number} bib */
  function markBg(bib) {
    const mark = settings.marks[bib];
    return (mark && colorOf(mark, settings.myColor)?.bg) || '';
  }

  /** m'ss" — an ascent is minutes, so prettyTime's m:ss reads as a gap here. */
  function ascentTime(s) {
    const m = Math.floor(s / 60);
    return `${m}'${String(Math.round(s - m * 60)).padStart(2, '0')}"`;
  }
</script>

<div class="wrap">
  {#if !race.climbs.length}
    <p class="hint">
      No climbs on this stage — or no altimetry loaded for it yet.
    </p>
  {/if}

  {#each rows as { climb, times, state } (climb.id)}
    <section class:on={state === 'on'}>
      <header>
        <span class="cat cat{climb.cat ?? 'X'}">{climb.cat ?? '–'}</span>
        <h3>{climb.isFinish ? '🏁 ' : ''}{climb.name}</h3>
        <span class="spec">
          {climb.lengthKm} km · {climb.avgPct}% · +{climb.gain} m
        </span>
        <span class="where">
          {#if state === 'on'}
            <b class="live">climbing now</b>
          {:else if state === 'done'}
            done
          {:else if leaderKm != null}
            in {(leaderKm - climb.footKmToGo).toFixed(1)} km
          {/if}
        </span>
      </header>

      {#if times.length}
        <ol>
          {#each expanded[climb.id] ? times : times.slice(0, TOP_N) as t, i (t.bib)}
            <li class:marked={markBg(t.bib)} style={markBg(t.bib) ? `--mark: ${markBg(t.bib)}` : ''}>
              <span class="pos">{i + 1}</span>
              <button class="who" onclick={() => (ui.selectedRider = t.bib)} title={teamOf(t.bib)}>
                <span class="bib">{t.bib}</span>{riderName(t.bib)}
              </button>
              <span class="time">{ascentTime(t.secs)}</span>
              <span class="gap">{i === 0 ? '' : `+${ascentTime(t.secs - times[0].secs)}`}</span>
              <span class="vam" style="color: {vamColor(t.vam)}">{t.vam}</span>
              <span class="kph">{t.kph} km/h</span>
            </li>
          {/each}
        </ol>
        {#if times.length > TOP_N}
          <button class="more" onclick={() => (expanded[climb.id] = !expanded[climb.id])}>
            {expanded[climb.id] ? 'show fewer' : `show all ${times.length}`}
          </button>
        {/if}
      {:else}
        <p class="empty">
          {#if state === 'ahead'}
            not reached yet
          {:else}
            no rider timed{climb.isFinish ? ' — the feed stops following most of the field before the line' : ' yet'}
          {/if}
        </p>
      {/if}
    </section>
  {/each}
</div>

<style>
  .wrap {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .hint {
    color: #666;
    font-size: 13px;
    padding: 1rem;
  }
  section {
    border: 1px solid #e2e0da;
    border-radius: 6px;
    background: #fff;
    overflow: hidden;
  }
  section.on {
    border-color: #ba4a19;
    box-shadow: 0 0 0 1px #ba4a19;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 6px 8px;
    background: #f4f3ef;
    border-bottom: 1px solid #e2e0da;
    font-size: 12px;
    color: #555;
    flex-wrap: wrap;
  }
  h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #222;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cat {
    font-weight: 700;
    font-size: 11px;
    min-width: 20px;
    padding: 1px 5px;
    text-align: center;
    border-radius: 3px;
    color: #fff;
    background: #9e9e9e;
    align-self: center;
  }
  /* Steeper category = hotter, matching the road-grade scale used elsewhere. */
  .catHC { background: #b71c1c; }
  .cat1 { background: #e65100; }
  .cat2 { background: #ef6c00; }
  .cat3 { background: #f9a825; color: #4a3800; }
  .cat4 { background: #9ccc65; color: #24340f; }
  .spec {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .where {
    color: #999;
    white-space: nowrap;
    margin-left: auto;
  }
  .live {
    color: #ba4a19;
    font-weight: 700;
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    grid-template-columns: 24px 1fr 54px 54px 46px 58px;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    font-size: 12px;
    color: #222;
    font-variant-numeric: tabular-nums;
  }
  li:nth-child(even) {
    background: #faf9f6;
  }
  li.marked {
    box-shadow: inset 3px 0 0 var(--mark);
  }
  .pos {
    color: #999;
    text-align: right;
  }
  .who {
    background: none;
    border: 0;
    color: #222;
    font: inherit;
    padding: 0;
    text-align: left;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who:hover {
    text-decoration: underline;
  }
  .bib {
    color: #999;
    margin-right: 5px;
    font-variant-numeric: tabular-nums;
  }
  .time {
    text-align: right;
    font-weight: 700;
  }
  .gap {
    text-align: right;
    color: #ba4a19;
    font-weight: 600;
  }
  .vam {
    text-align: right;
    font-weight: 700;
  }
  .kph {
    text-align: right;
    color: #1565c0;
    font-weight: 600;
  }
  .empty {
    margin: 0;
    padding: 8px;
    color: #999;
    font-size: 12px;
  }
  .more {
    width: 100%;
    background: #f4f3ef;
    border: 0;
    border-top: 1px solid #e2e0da;
    color: #555;
    font-size: 11px;
    padding: 4px;
    cursor: pointer;
  }
  .more:hover {
    color: #222;
  }
</style>
