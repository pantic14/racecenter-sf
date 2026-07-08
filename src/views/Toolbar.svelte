<script>
  import { race, togglePause } from '../lib/state/race.svelte.js';
  import { settings } from '../lib/state/settings.svelte.js';
  import { ui } from '../lib/state/ui.svelte.js';
  import { MARK_COLORS, colorOf } from '../lib/colors.js';

  const kmToGo = $derived(race.tick?.riders[0]?.kmToFinish);

  function selectTeam(team) {
    ui.selectedTeam = ui.selectedTeam === team._id ? '' : team._id;
  }

  function teamBibs(teamId) {
    return Object.entries(race.riders)
      .filter(([, info]) => info?.$team?.split(':')[1] === teamId)
      .map(([bib]) => bib);
  }

  function markTeam(colorId) {
    for (const bib of teamBibs(ui.selectedTeam)) {
      if (colorId) settings.marks[bib] = colorId;
      else delete settings.marks[bib];
    }
  }
</script>

<header class="toolbar">
  <div class="km" title="km to the finish (head of race)">
    <b>{kmToGo != null ? kmToGo.toFixed(1) : '—'}</b><span>km to go</span>
  </div>

  <nav>
    <button class:active={ui.tab === 'list'} onclick={() => (ui.tab = 'list')}>Peloton</button>
    <button class:active={ui.tab === 'profile'} onclick={() => (ui.tab = 'profile')}>Profile</button>
    <button class:active={ui.tab === 'settings'} onclick={() => (ui.tab = 'settings')}>Settings</button>
    <button class="pause" onclick={togglePause} title={race.paused ? 'resume' : 'pause the view (data keeps flowing)'}>
      {race.paused ? '▶' : '⏸'}
    </button>
  </nav>

  <span class="status {race.status.sse}" title="live data connection">{race.status.sse}</span>

  <div class="stage">{race.stage ? `${race.stage.name} · ${race.stage.length} km` : ''}</div>

  <div class="jerseys">
    {#each race.teams as team (team._id)}
      <button
        class="jersey"
        class:selected={ui.selectedTeam === team._id}
        title={team.name}
        onclick={() => selectTeam(team)}
      >
        <img src={team.jersey_sm} alt={team.name} />
      </button>
    {/each}
  </div>

  {#if ui.selectedTeam}
    <div class="teamtools">
      mark team:
      {#each MARK_COLORS as c (c.id)}
        <button
          class="dot"
          style="background:{colorOf(c.id, settings.myColor).bg}"
          title={c.id}
          onclick={() => markTeam(c.id)}
        ></button>
      {/each}
      <button class="dot clear" title="unmark team" onclick={() => markTeam(null)}>×</button>
    </div>
  {/if}
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    background: #fee5d9;
    border-bottom: 2px solid #ba4a19;
    padding: 6px 10px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .km b {
    font-size: 26px;
    color: #222;
    font-variant-numeric: tabular-nums;
  }
  .km span {
    font-size: 11px;
    color: #777;
    display: block;
    margin-top: -4px;
  }
  nav {
    display: flex;
    gap: 4px;
  }
  nav button {
    border: 1px solid #ba4a19;
    background: #fff;
    color: #ba4a19;
    border-radius: 4px;
    padding: 4px 10px;
    cursor: pointer;
    font-family: inherit;
    font-weight: 600;
  }
  nav button.active {
    background: #ba4a19;
    color: #fff;
  }
  nav .pause {
    min-width: 34px;
  }
  .status {
    font-size: 11px;
    color: #fff;
    background: #888;
    border-radius: 10px;
    padding: 1px 8px;
  }
  .status.live { background: #2e7d32; }
  .status.stale { background: #b26a00; }
  .status.connecting, .status.reconnecting { background: #c62828; }
  .stage {
    font-size: 12px;
    color: #555;
  }
  .jerseys {
    display: flex;
    flex-wrap: wrap;
    gap: 1px;
    margin-left: auto;
  }
  .jersey {
    border: none;
    background: transparent;
    padding: 1px;
    cursor: pointer;
    border-radius: 3px;
  }
  .jersey img {
    width: 22px;
    display: block;
  }
  .jersey.selected,
  .jersey:hover {
    background: #ffa47b;
  }
  .teamtools {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #555;
    width: 100%;
  }
  .dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.3);
    cursor: pointer;
    padding: 0;
  }
  .dot.clear {
    background: #fff;
    font-size: 12px;
    line-height: 1;
  }
</style>
