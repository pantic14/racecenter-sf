<script>
  import { onMount } from 'svelte';
  import { race, applyTick, setSseStatus, pushError } from './lib/state/race.svelte.js';
  import { settings, settingsMeta, initSettings, persistSettings } from './lib/state/settings.svelte.js';
  import { ui } from './lib/state/ui.svelte.js';
  import { createLiveSource } from './lib/data/sse.js';
  import { fetchRiders, fetchTeams, fetchStages } from './lib/data/api.js';
  import { BASE_URL, TELEMETRY_BIND } from './lib/config.js';
  import { loadMockEventSource } from './lib/data/mock.js';
  import { logGroups } from './lib/storage/tickLog.js';
  import { beep } from './lib/alerts/sound.js';
  import Toolbar from './views/Toolbar.svelte';
  import ListView from './views/ListView.svelte';
  import SettingsPanel from './views/SettingsPanel.svelte';
  import RiderCard from './views/RiderCard.svelte';

  const params = new URLSearchParams(location.search);
  const mockParam = params.get('mock');
  const mockFixture = mockParam === '1' ? 'synthetic-basic' : mockParam;
  const speed = Number(params.get('speed')) || 1;

  onMount(() => {
    let source;
    (async () => {
      await initSettings();

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

  // persist settings on any deep change (debounced in storage layer)
  $effect(() => {
    const snapshot = $state.snapshot(settings);
    if (settingsMeta.loaded) persistSettings(snapshot);
  });

  // slow-rider beep
  $effect(() => {
    const tick = race.tick;
    if (!tick || !settings.soundOn) return;
    const anySlow = tick.riders.some(
      (r) => r.kph < settings.maxSlowSpeed && (settings.beepForAll || settings.marks[r.bib]),
    );
    if (anySlow) beep(240, 60);
  });

  // group history log (feeds the future gap-evolution view)
  const historyKey = $derived(mockFixture ? `mock:${mockFixture}` : (race.stage?.date?.substring(0, 10) ?? ''));
  $effect(() => {
    const tick = race.tick;
    if (!tick || !historyKey) return;
    logGroups(historyKey, tick.timeStamp, $state.snapshot(race.groups)).catch(() => {});
  });
</script>

<Toolbar />

{#if mockFixture}
  <div class="mockbar">
    <span class="badge">MOCK {mockFixture} ×{speed}</span>
    <a href="index.html">← back to live mode</a>
  </div>
{/if}

{#each race.status.errors as err}
  <p class="error">[{err.source}] {err.message}</p>
{/each}

{#if ui.tab === 'settings'}
  <SettingsPanel />
{:else}
  {#if !race.tick && !mockFixture && race.status.sse !== 'live'}
    <p class="waithint">
      no live race right now —
      <a href="?mock=1&speed=10">▶ replay a synthetic one (mock ×10)</a>
    </p>
  {/if}
  <ListView />
{/if}

<RiderCard />

<style>
  :global(body) {
    margin: 0;
    font-family: system-ui, -apple-system, sans-serif;
    background: #fafaf8;
    color: #222;
  }
  .mockbar {
    background: #ede7f6;
    padding: 4px 10px;
    font-size: 12px;
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .badge {
    background: #6a1b9a;
    color: #fff;
    border-radius: 10px;
    padding: 1px 8px;
    font-size: 11px;
  }
  .error {
    color: #c62828;
    padding: 2px 10px;
    margin: 0;
    font-size: 13px;
  }
  .waithint {
    padding: 8px 10px;
    font-size: 13px;
    color: #666;
  }
</style>
