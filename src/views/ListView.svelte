<script>
  import { race } from '../lib/state/race.svelte.js';
  import { prettyTime } from '../lib/util.js';
  import RiderChip from './RiderChip.svelte';

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
        <span class="gkm">{group.kmToFinish.toFixed(1)} km to go</span>
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
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
</style>
