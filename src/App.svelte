<script>
  import { onMount } from 'svelte';
  import { race, applyTick, setSseStatus, pushError, setRoute, setClimbs } from './lib/state/race.svelte.js';
  import { settings, settingsMeta, initSettings, persistSettings } from './lib/state/settings.svelte.js';
  import { ui } from './lib/state/ui.svelte.js';
  import { registerReplayHooks, getReplayTrace, getReplayCheckpoints, getReplayTicks } from './lib/state/replaySession.svelte.js';
  import { recordRawUpdate } from './lib/state/discovery.svelte.js';
  import { createLiveSource } from './lib/data/sse.js';
  import { fetchRiders, fetchTeams, fetchStages, fetchProfileCsv, fetchTrace, fetchCheckpoints } from './lib/data/api.js';
  import { BASE_URL, TELEMETRY_BIND } from './lib/config.js';
  import { loadMockEventSource } from './lib/data/mock.js';
  import { parseRouteCsv, parseTraceJson } from './lib/domain/route.js';
  import { extractClimbs } from './lib/domain/climbs.js';
  import { logGroups } from './lib/storage/tickLog.js';
  import { beep, playPattern, PATTERNS } from './lib/alerts/sound.js';
  import { createAlertEngine } from './lib/alerts/engine.js';
  import { pushAlert } from './lib/state/alerts.svelte.js';
  import Toolbar from './views/Toolbar.svelte';
  import ReplayBar from './views/ReplayBar.svelte';
  import ListView from './views/ListView.svelte';
  import ProfileView from './views/ProfileView.svelte';
  import ClimbsView from './views/ClimbsView.svelte';
  import SettingsPanel from './views/SettingsPanel.svelte';
  import HistoryView from './views/HistoryView.svelte';
  import RiderCard from './views/RiderCard.svelte';
  import Toasts from './views/Toasts.svelte';

  const params = new URLSearchParams(location.search);
  const mockParam = params.get('mock');
  const mockFixture = mockParam === '1' ? 'synthetic-basic' : mockParam;
  const speed = Number(params.get('speed')) || 1;

  // The live SSE is started/stopped as a unit so replay can suspend it and resume
  // it on exit. esImpl (real EventSource or the mock replayer) is fixed at mount.
  let liveSource = null;
  let esImpl = EventSource;

  function stopLive() {
    liveSource?.close();
    liveSource = null;
  }
  function startLive() {
    liveSource = createLiveSource({
      url: BASE_URL + '/live-stream',
      bind: TELEMETRY_BIND,
      onTick: applyTick,
      onStatus: setSseStatus,
      onRaw: recordRawUpdate,
      EventSourceImpl: esImpl,
    });
  }

  onMount(() => {
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

      if (mockFixture) {
        try {
          esImpl = await loadMockEventSource(mockFixture, speed);
        } catch (e) {
          pushError('mock', e.message);
        }
      }
      registerReplayHooks({ stopLive, startLive, resetAlertEngine });
      startLive();
    })();
    return () => stopLive();
  });

  // Sole owner of the stage's altimetry and climbs. Everything comes from ASO's trace —
  // embedded in the recording when replaying (so a replay needs no network and can't rot),
  // otherwise fetched for the stage on screen. A profile CSV configured by hand in Settings
  // overrides the ROUTE only, being denser (~1600 points vs ~750); it carries no points of
  // interest, so the climbs still come from the trace either way.
  // Nothing else may call setRoute/setClimbs: this reruns on stage/replay/settings changes,
  // so a second writer would race it and win only by accident.
  const stageDate = $derived(race.stage?.date?.substring(0, 10) ?? '');
  const stageNo = $derived(race.stage?.stage ?? null);
  const replayId = $derived(ui.replay?.id ?? null);
  const profileUrl = $derived(
    mockFixture ? 'fixtures/profile-synthetic.csv' : (settings.profileUrls[stageDate] || ''),
  );
  $effect(() => {
    if (!settingsMeta.loaded) return;
    const url = profileUrl;
    const stage = stageNo;
    replayId; // re-resolve when a replay is entered, swapped or left
    let cancelled = false;

    (async () => {
      // The synthetic fixture is a bare profile with no stage behind it; fetching the real
      // trace for whatever stage the calendar says is today would be nonsense in mock mode.
      const live = !mockFixture && stage != null;
      let trace = mockFixture ? null : getReplayTrace();
      if (!trace && live) {
        try {
          trace = await fetchTrace(stage);
        } catch (e) {
          pushError('profile', `stage ${stage} altimetry: ${e.message}`);
        }
      }

      // Climbs are ASO's own, never derived: name, length, gradient and category all come
      // stated. A recording carries its own copy, because this endpoint is per-season and
      // will not answer for 2026 forever.
      let checkpoints = mockFixture ? null : getReplayCheckpoints();
      if (!checkpoints && live) {
        try {
          checkpoints = await fetchCheckpoints(stage);
        } catch (e) {
          pushError('climbs', `stage ${stage} checkpoints: ${e.message}`);
        }
      }
      if (cancelled) return;
      // The replay's ticks prime the ascent times, so a loaded stage shows its climbs
      // already ridden rather than filling in as it plays.
      setClimbs(checkpoints ? extractClimbs(checkpoints) : [], getReplayTicks());

      if (url) {
        // Anything wrong with the CSV (unreachable, or parsed to nothing) falls through to
        // the trace rather than leaving the stage with no altitude at all.
        try {
          const points = parseRouteCsv(await fetchProfileCsv(url));
          if (cancelled) return;
          if (points.length) {
            setRoute(points);
            return;
          }
          pushError('profile', `profile CSV parsed to 0 points (${url})`);
        } catch (e) {
          if (cancelled) return;
          pushError('profile', e.message);
        }
      }

      const points = trace ? parseTraceJson(trace) : [];
      if (trace && !points.length) pushError('profile', `stage ${stage} trace parsed to 0 points`);
      setRoute(points);
    })();

    return () => {
      cancelled = true;
    };
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

  // smart alerts: evaluate every tick over the tracked groups.
  // Recreated on entering/leaving/seeking a replay so no alert state spans the jump.
  let alertEngine = createAlertEngine();
  function resetAlertEngine() {
    alertEngine = createAlertEngine();
  }
  $effect(() => {
    const tick = race.tick;
    if (!tick) return;
    const events = alertEngine.evaluate(
      race.groups,
      tick.timeStamp,
      settings.marks,
      (bib) => {
        const r = race.riders[bib];
        return r ? `${r.lastnameshort ?? r.lastname ?? ''}`.trim() || `#${bib}` : `#${bib}`;
      },
      settings.alerts,
    );
    for (const event of events) {
      pushAlert(event);
      if (settings.soundOn) playPattern(PATTERNS[event.type]);
    }
  });

  // group history log (feeds the future gap-evolution view)
  const historyKey = $derived(mockFixture ? `mock:${mockFixture}` : (race.stage?.date?.substring(0, 10) ?? ''));
  $effect(() => {
    race.historyKey = historyKey;
  });
  $effect(() => {
    const tick = race.tick;
    // Don't record history during replay — the stage is already archived.
    if (!tick || !historyKey || ui.replay) return;
    logGroups(historyKey, tick.timeStamp, $state.snapshot(race.groups)).catch(() => {});
  });
</script>

<Toolbar />
<ReplayBar />

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
{:else if ui.tab === 'profile'}
  <ProfileView />
{:else if ui.tab === 'climbs'}
  <ClimbsView />
{:else if ui.tab === 'history'}
  <HistoryView />
{:else}
  {#if import.meta.env.DEV && !race.tick && !mockFixture && race.status.sse !== 'live'}
    <p class="waithint">
      no live race right now —
      <a href="?mock=1&speed=10">▶ replay a synthetic one (mock ×10)</a>
    </p>
  {/if}
  <ListView />
{/if}

<RiderCard />
<Toasts />

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
