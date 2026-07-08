<script>
  import { onMount } from 'svelte';
  import { race, applyTick, setSseStatus, pushError } from './lib/state/race.svelte.js';
  import { createLiveSource } from './lib/data/sse.js';
  import { fetchRiders, fetchTeams, fetchStages } from './lib/data/api.js';
  import { BASE_URL, TELEMETRY_BIND } from './lib/config.js';
  import { loadMockEventSource } from './lib/data/mock.js';

  const params = new URLSearchParams(location.search);
  const mockParam = params.get('mock');
  const mockFixture = mockParam === '1' ? 'synthetic-basic' : mockParam;
  const speed = Number(params.get('speed')) || 1;

  onMount(() => {
    let source;
    (async () => {
      // REST loads in parallel; a failure is surfaced in the UI, never blocks the rest
      const [ridersRes, teamsRes, stagesRes] = await Promise.allSettled([
        fetchRiders(),
        fetchTeams(),
        fetchStages(),
      ]);
      if (ridersRes.status === 'fulfilled') race.riders = ridersRes.value;
      else pushError('riders', String(ridersRes.reason?.message ?? ridersRes.reason));
      if (teamsRes.status === 'fulfilled') race.teams = teamsRes.value;
      else pushError('teams', String(teamsRes.reason?.message ?? teamsRes.reason));
      if (stagesRes.status === 'fulfilled') race.stage = stagesRes.value.currentStage;
      else pushError('stages', String(stagesRes.reason?.message ?? stagesRes.reason));

      let EventSourceImpl = EventSource;
      if (mockFixture) {
        try {
          EventSourceImpl = await loadMockEventSource(mockFixture, speed);
        } catch (e) {
          pushError('mock', e.message);
        }
      }
      source = createLiveSource({
        url: BASE_URL + '/live-stream',
        bind: TELEMETRY_BIND,
        onTick: applyTick,
        onStatus: setSseStatus,
        EventSourceImpl,
      });
    })();
    return () => source?.close();
  });

  const firstRiders = $derived(race.tick ? race.tick.riders.slice(0, 10) : []);

  function riderName(bib) {
    const r = race.riders[bib];
    return r ? `${r.lastnameshort ?? r.lastname} ${r.firstname ?? ''}` : `#${bib}`;
  }

  function fmtGap(s) {
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.round(s - m * 60)).padStart(2, '0')}`;
  }
</script>

<main>
  <h1>Racecenter Peloton <small>M0 debug</small></h1>

  {#if mockFixture}
    <span class="badge mock">MOCK {mockFixture} ×{speed}</span>
  {/if}
  <span class="badge {race.status.sse}">{race.status.sse}</span>

  {#each race.status.errors as err}
    <p class="error">[{err.source}] {err.message}</p>
  {/each}

  <p>
    riders: <b>{Object.keys(race.riders).length}</b> ·
    teams: <b>{race.teams.length}</b> ·
    stage: <b>{race.stage ? `${race.stage.name} (${race.stage.length} km)` : '—'}</b>
  </p>

  {#if race.tick}
    <p>
      tick @ {new Date(race.tick.timeStamp * 1000).toLocaleTimeString()} ·
      {race.tick.riders.length} riders in feed ·
      head of race: <b>{race.tick.riders[0]?.kmToFinish?.toFixed(2)} km to go</b>
    </p>
    <table>
      <thead><tr><th>bib</th><th>rider</th><th>gap</th><th>km to go</th><th>km/h</th></tr></thead>
      <tbody>
        {#each firstRiders as r (r.bib)}
          <tr>
            <td>{r.bib}</td>
            <td>{riderName(r.bib)}</td>
            <td>{fmtGap(r.secToFirstRider)}</td>
            <td>{r.kmToFinish?.toFixed(2)}</td>
            <td>{r.kph?.toFixed(1)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p>waiting for first tick… (outside race hours the stream is silent → "stale")</p>
  {/if}
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    padding: 1rem;
    max-width: 720px;
  }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 0.8rem;
    color: #fff;
    background: #888;
    margin-right: 6px;
  }
  .badge.live { background: #2e7d32; }
  .badge.stale { background: #b26a00; }
  .badge.reconnecting, .badge.connecting { background: #c62828; }
  .badge.mock { background: #6a1b9a; }
  .error { color: #c62828; }
  table { border-collapse: collapse; margin-top: 0.5rem; }
  th, td { border: 1px solid #ccc; padding: 2px 8px; text-align: right; }
  td:nth-child(2), th:nth-child(2) { text-align: left; }
</style>
