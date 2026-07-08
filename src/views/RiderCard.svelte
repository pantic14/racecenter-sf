<script>
  import { race } from '../lib/state/race.svelte.js';
  import { settings } from '../lib/state/settings.svelte.js';
  import { ui } from '../lib/state/ui.svelte.js';
  import { MARK_COLORS, colorOf } from '../lib/colors.js';

  const bib = $derived(ui.selectedRider);
  const info = $derived(bib != null ? race.riders[bib] : null);

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
