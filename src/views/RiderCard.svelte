<script>
  import { race } from '../lib/state/race.svelte.js';
  import { settings } from '../lib/state/settings.svelte.js';
  import { ui } from '../lib/state/ui.svelte.js';
  import { MARK_COLORS, colorOf, vamColor } from '../lib/colors.js';

  const bib = $derived(ui.selectedRider);
  const info = $derived(bib != null ? race.riders[bib] : null);

  // The live tick (with the attached vam* fields) lives inside race.groups,
  // reassigned every tick — the static race.riders map has no telemetry.
  const tick = $derived.by(() => {
    if (bib == null) return null;
    for (const g of race.groups) {
      for (const r of g.riders) if (r.bib === bib) return r;
    }
    return null;
  });

  const vams = $derived([
    { lbl: 'inst', v: tick?.vamInst },
    { lbl: '500m', v: tick?.vam500 },
    { lbl: '1km', v: tick?.vam1k },
    { lbl: '5km', v: tick?.vam5k },
  ]);
  const hasVam = $derived(vams.some((x) => x.v != null));

  function setMark(colorId) {
    if (bib == null) return;
    if (colorId) settings.marks[bib] = colorId;
    else delete settings.marks[bib];
    ui.selectedRider = null;
  }
</script>

{#if bib != null}
  <div class="backdrop" onclick={() => (ui.selectedRider = null)} role="presentation">
    <div class="card" onclick={(e) => e.stopPropagation()} role="dialog">
      <div class="who">
        {#if info?.profile_sm}<img src={info.profile_sm} alt="" />{/if}
        <div>
          <b>{info ? `${info.firstname ?? ''} ${info.lastname ?? ''}`.trim() : `Bib ${bib}`}</b>
          <div class="meta">bib {bib}{info?.team_name ? ` · ${info.team_name}` : ''}</div>
        </div>
      </div>
      {#if tick}
        <div class="vam" title="VAM m/h over the trailing road distance">
          <span class="vam-title">VAM</span>
          {#if hasVam}
            {#each vams as x (x.lbl)}
              <span class="vam-cell">
                <span class="vam-lbl">{x.lbl}</span>
                <span class="vam-val" style={x.v != null ? `color: ${vamColor(x.v)}` : ''}>
                  {x.v == null ? '—' : x.v}
                </span>
              </span>
            {/each}
          {:else}
            <span class="vam-hint">solo en ascenso</span>
          {/if}
        </div>
      {/if}
      <div class="palette">
        {#each MARK_COLORS as c (c.id)}
          <button
            class="swatch"
            class:active={settings.marks[bib] === c.id}
            style="background:{colorOf(c.id, settings.myColor).bg}"
            title={c.id}
            onclick={() => setMark(c.id)}
          ></button>
        {/each}
        <button class="clear" onclick={() => setMark(null)}>clear</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.25);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    z-index: 20;
  }
  .card {
    background: #fff;
    border-radius: 8px;
    padding: 14px;
    min-width: 300px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
  }
  .who {
    display: flex;
    gap: 10px;
    align-items: center;
    padding-bottom: 10px;
  }
  .who img {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    object-fit: cover;
  }
  .meta {
    font-size: 12px;
    color: #777;
  }
  .vam {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 0 10px;
    border-top: 1px solid #eee;
    font-variant-numeric: tabular-nums;
  }
  .vam-title {
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.04em;
    color: #999;
  }
  .vam-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.15;
  }
  .vam-lbl {
    font-size: 10px;
    color: #999;
  }
  .vam-val {
    font-weight: 700;
    font-size: 14px;
    color: #555;
  }
  .vam-hint {
    font-size: 12px;
    color: #999;
  }
  .palette {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }
  .swatch {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.25);
    cursor: pointer;
  }
  .swatch.active {
    outline: 3px solid #333;
    outline-offset: 1px;
  }
  .clear {
    margin-left: 6px;
    border: 1px solid #ccc;
    background: #f5f5f5;
    border-radius: 6px;
    padding: 4px 10px;
    cursor: pointer;
    font-family: inherit;
  }
</style>
