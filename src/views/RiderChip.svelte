<script>
  import { race } from '../lib/state/race.svelte.js';
  import { settings } from '../lib/state/settings.svelte.js';
  import { ui } from '../lib/state/ui.svelte.js';
  import { colorOf } from '../lib/colors.js';
  import { prettyTime } from '../lib/util.js';

  let { rider } = $props();

  const info = $derived(race.riders[rider.bib]);
  const name = $derived(
    info ? `${info.lastnameshort ?? info.lastname ?? ''} ${info.firstname ?? ''}`.trim() : `#${rider.bib}`,
  );
  const slow = $derived(rider.kph < settings.maxSlowSpeed);
  const mark = $derived(settings.marks[rider.bib]);
  const markColor = $derived(mark ? colorOf(mark, settings.myColor) : null);
  const inSelectedTeam = $derived(
    ui.selectedTeam !== '' && info?.$team?.split(':')[1] === ui.selectedTeam,
  );
  const tooltip = $derived(
    `${name} · bib ${rider.bib}\n${rider.kph} km/h (avg ${rider.kphAvg})\n${rider.kmToFinish} km to go`,
  );
</script>

<button
  class="chip"
  class:slow
  class:team={inSelectedTeam}
  style={markColor ? `background:${markColor.bg};color:${markColor.fg}` : ''}
  title={tooltip}
  onclick={() => (ui.selectedRider = rider.bib)}
>
  {#if ui.showBibs}<span class="bib">{rider.bib}</span>{/if}
  <span class="name">{name}</span>
  <span class="gap">{prettyTime(rider.secToFirstRider)}</span>
</button>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    padding: 2px 6px;
    font-size: 12px;
    line-height: 1.5;
    cursor: pointer;
    font-family: inherit;
  }
  .chip:hover {
    border-color: #999;
  }
  .chip.team {
    outline: 2px solid #ba4a19;
    outline-offset: -1px;
  }
  .chip.slow {
    background: #000 !important;
    color: #fff !important;
  }
  .bib {
    background: #fff;
    color: #000;
    border: 1px solid #000;
    font-size: 9px;
    padding: 0 2px;
    border-radius: 2px;
  }
  .gap {
    color: inherit;
    opacity: 0.65;
    font-variant-numeric: tabular-nums;
  }
</style>
