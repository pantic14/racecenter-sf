<script>
  import { race } from '../lib/state/race.svelte.js';
  import { ui } from '../lib/state/ui.svelte.js';
  import { DATA_REPO_URL } from '../lib/config.js';
  import { fetchIndex, listCached } from '../lib/data/archive.js';
  import {
    playRecordingEntry,
    playRecordingBlob,
    replayPlay,
    replayPause,
    replayTogglePlay,
    replaySeek,
    replaySetSpeed,
    exitReplay,
    isReplaying,
  } from '../lib/state/replaySession.svelte.js';

  const SPEEDS = [1, 5, 10, 30, 60];

  /** @type {import('../lib/data/archive.js').IndexEntry[]|null} */
  let entries = $state(null); // null = not loaded yet
  let loadError = $state('');
  /** @type {{id:string}[]} */
  let cached = $state([]);
  /** @type {{id:string, received:number, total:number}|null} */
  let dl = $state(null);

  const baseUrl = DATA_REPO_URL;
  const kmToGo = $derived(race.tick?.riders[0]?.kmToFinish);

  // While the user drags the scrubber, suspend playback so the running loop's progress
  // updates don't fight the slider's value (which would make the thumb jump between the
  // playback position and the drag target). Resume afterwards if it was playing.
  let resumeAfterScrub = false;
  function scrubStart() {
    resumeAfterScrub = isReplaying();
    if (resumeAfterScrub) replayPause();
  }
  function scrubEnd() {
    if (resumeAfterScrub) replayPlay();
    resumeAfterScrub = false;
  }

  async function loadIndex() {
    loadError = '';
    entries = null;
    cached = await listCached().catch(() => []);
    try {
      entries = await fetchIndex(baseUrl);
    } catch (e) {
      loadError = e.message;
      entries = [];
    }
  }

  // Fetch the manifest the first time the picker opens (not during active replay).
  $effect(() => {
    if (ui.replayOpen && !ui.replay && entries === null) loadIndex();
  });

  const isCached = (id) => cached.some((c) => c.id === id);

  async function pick(entry) {
    dl = { id: entry.id, received: 0, total: entry.bytes };
    try {
      await playRecordingEntry(baseUrl, entry, (received, total) => (dl = { id: entry.id, received, total }));
    } catch (e) {
      loadError = e.message;
    }
    dl = null;
  }

  async function pickFile(e) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    try {
      await playRecordingBlob(file, file.name);
    } catch (err) {
      loadError = err.message;
    }
  }

  function back() {
    exitReplay();
    closePicker();
  }

  function closePicker() {
    ui.replayOpen = false;
    entries = null; // force a fresh index fetch next open (repo URL may have changed)
  }

  const fmtSize = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const fmtTime = (t) => (t ? new Date(t * 1000).toLocaleTimeString() : '—');
</script>

{#if ui.replay}
  <!-- transport controls for the active replay -->
  <div class="replaybar">
    <span class="badge">REPLAY</span>
    <button class="ctrl" onclick={replayTogglePlay}>
      {ui.replay.playing ? '⏸' : '⏵'}
    </button>

    <div class="speeds">
      {#each SPEEDS as s}
        <button class="spd" class:active={ui.replay.speed === s} onclick={() => replaySetSpeed(s)}>{s}×</button>
      {/each}
    </div>

    <input
      class="scrub"
      type="range"
      min="0"
      max={Math.max(0, ui.replay.total - 1)}
      value={Math.max(0, ui.replay.i)}
      onpointerdown={scrubStart}
      onpointerup={scrubEnd}
      onpointercancel={scrubEnd}
      oninput={(e) => replaySeek(+e.currentTarget.value)}
    />

    <span class="clock" title="stage time · km to finish">
      {fmtTime(ui.replay.t)} · {kmToGo != null ? `${kmToGo.toFixed(1)} km` : '—'}
    </span>

    <button class="back" onclick={back}>← back to live</button>
  </div>
{:else if ui.replayOpen}
  <!-- stage picker -->
  <div class="replaybar picker">
    <span class="badge">REPLAY</span>
    <strong>Replay a past stage</strong>

    {#if entries === null}
      <span class="hint">loading…</span>
    {:else if entries.length}
      <select
        class="stagesel"
        onchange={(e) => {
          const entry = entries.find((x) => x.id === e.currentTarget.value);
          if (entry) pick(entry);
          e.currentTarget.selectedIndex = 0;
        }}
      >
        <option value="">choose a stage…</option>
        {#each entries as entry (entry.id)}
          <option value={entry.id}>
            {entry.date} · {entry.name} · {fmtSize(entry.bytes)}{isCached(entry.id) ? ' ✓' : ''}
          </option>
        {/each}
      </select>
    {:else}
      <span class="hint">no recordings in the data repo yet</span>
    {/if}

    {#if dl}
      <span class="hint">downloading… {fmtSize(dl.received)}{dl.total ? ` / ${fmtSize(dl.total)}` : ''}</span>
    {/if}
    {#if loadError}
      <span class="err" title="set the data repo URL in Settings → Replay">repo: {loadError}</span>
    {/if}

    <label class="file">
      open local .json.gz
      <input type="file" accept=".gz,.json.gz,application/gzip" onchange={pickFile} />
    </label>

    <button class="back" onclick={closePicker}>close</button>
  </div>
{/if}

<style>
  .replaybar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    background: #ede7f6;
    border-bottom: 2px solid #6a1b9a;
    padding: 5px 10px;
    position: sticky;
    top: 0;
    z-index: 9;
    font-size: 13px;
  }
  .badge {
    background: #6a1b9a;
    color: #fff;
    border-radius: 10px;
    padding: 1px 8px;
    font-size: 11px;
    font-weight: 700;
  }
  button {
    font-family: inherit;
    border: 1px solid #6a1b9a;
    background: #fff;
    color: #6a1b9a;
    border-radius: 4px;
    padding: 3px 8px;
    cursor: pointer;
  }
  button:hover {
    background: #f3e5f5;
  }
  .ctrl {
    min-width: 34px;
    font-size: 14px;
  }
  .speeds {
    display: flex;
    gap: 2px;
  }
  .spd {
    padding: 3px 6px;
    font-variant-numeric: tabular-nums;
  }
  .spd.active {
    background: #6a1b9a;
    color: #fff;
  }
  .scrub {
    flex: 1;
    min-width: 120px;
    accent-color: #6a1b9a;
  }
  .clock {
    font-variant-numeric: tabular-nums;
    color: #4a148c;
    min-width: 130px;
  }
  .stagesel {
    font-family: inherit;
    font-size: 13px;
    max-width: 320px;
  }
  .file {
    font-size: 12px;
    color: #4a148c;
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }
  .file input {
    font-size: 11px;
  }
  .hint {
    font-size: 12px;
    color: #777;
  }
  .err {
    font-size: 12px;
    color: #c62828;
  }
  .back {
    margin-left: auto;
  }
</style>
