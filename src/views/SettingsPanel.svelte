<script>
  import { settings } from '../lib/state/settings.svelte.js';
  import { race } from '../lib/state/race.svelte.js';
  import { discovery, discoveryDump } from '../lib/state/discovery.svelte.js';
  import { MARK_COLORS, colorOf } from '../lib/colors.js';
  import { YEAR, BASE_URL } from '../lib/config.js';

  import { RACE_KEY } from '../lib/config.js';
  import { parseBibList, bibsForColor, syncColorList, exportMarks, importMarks } from '../lib/marks.js';
  import { listCached, deleteCached } from '../lib/data/archive.js';

  let importText = $state('');
  let importMsg = $state('');
  let stageApiDump = $state('');
  /** unsaved edits per color; when absent the input mirrors the live marks */
  let drafts = $state({});
  let exportMsg = $state('');

  const stageDate = $derived(race.stage?.date?.substring(0, 10) ?? '');

  function listShown(colorId) {
    return drafts[colorId] ?? bibsForColor(settings.marks, colorId).join(', ');
  }

  function applyColor(colorId) {
    syncColorList(settings.marks, colorId, parseBibList(listShown(colorId)));
    delete drafts[colorId];
  }

  async function copyMarks() {
    await navigator.clipboard.writeText(exportMarks($state.snapshot(settings.marks), RACE_KEY));
    exportMsg = 'copied to clipboard';
  }

  function downloadMarks() {
    const blob = new Blob([exportMarks($state.snapshot(settings.marks), RACE_KEY)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `racecenter-marks-${stageDate || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function doImport() {
    try {
      const { count, legacy } = importMarks(settings.marks, importText);
      if (legacy.minGap) settings.minGap = legacy.minGap;
      if (legacy.maxSlowSpeed) settings.maxSlowSpeed = legacy.maxSlowSpeed;
      if (legacy.myColor) settings.myColor = legacy.myColor;
      importMsg = `imported ok (${count} marked riders)`;
      importText = '';
      drafts = {};
    } catch (e) {
      importMsg = `import failed: ${e.message}`;
    }
  }

  async function dumpStageApi() {
    try {
      const res = await fetch(`${BASE_URL}/api/stage-${YEAR}`);
      const text = await res.text();
      // surface any hint of profile/route file urls
      const hits = text.match(/[^"]*(profil|\.csv|route)[^"]*/gi) ?? [];
      stageApiDump = (hits.length ? `MATCHES:\n${hits.slice(0, 30).join('\n')}\n\n` : 'no profile/csv/route strings found\n\n') + text.slice(0, 4000) + '…';
    } catch (e) {
      stageApiDump = `failed: ${e.message}`;
    }
  }

  function clearAllMarks() {
    settings.marks = {};
    drafts = {};
  }

  /** @type {{id:string, bytes:number, entry:any}[]} */
  let cachedRecs = $state([]);
  async function refreshCached() {
    cachedRecs = await listCached().catch(() => []);
  }
  $effect(() => {
    refreshCached();
  });
  async function removeCached(id) {
    await deleteCached(id);
    await refreshCached();
  }
  const fmtSize = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
</script>

<div class="panel">
  <section>
    <h3>Groups & speed</h3>
    <label>
      A new group forms when a gap is at least
      <select bind:value={settings.minGap}>
        {#each [2, 3, 4, 5] as v}<option value={v}>{v}</option>{/each}
      </select>
      seconds
    </label>
    <label>
      Highlight a rider when speed drops below
      <select bind:value={settings.maxSlowSpeed}>
        {#each [2, 3, 4, 5, 6, 7] as v}<option value={v}>{v}</option>{/each}
      </select>
      km/h
    </label>
    <label><input type="checkbox" bind:checked={settings.soundOn} /> sound on</label>
    <label>
      <input type="checkbox" bind:checked={settings.beepForAll} />
      beep for any slow rider (off = only marked riders)
    </label>
    <label>
      my color <input type="color" bind:value={settings.myColor} />
      (the "orange" slot of the palette)
    </label>
  </section>

  <section>
    <h3>Marked riders by color</h3>
    <p class="hint">
      Live lists: marking a rider anywhere (peloton view, team marking…) updates them.
      Edit the comma-separated bibs and Apply (or Enter) to sync — bibs you remove get unmarked.
    </p>
    {#each MARK_COLORS as c (c.id)}
      <div class="bulkrow">
        <span class="dot" style="background:{colorOf(c.id, settings.myColor).bg}" title={c.id}></span>
        <span class="count">{bibsForColor(settings.marks, c.id).length}</span>
        <input
          type="text"
          placeholder="bibs for {c.id} (e.g. 1, 51, 61)"
          class:dirty={drafts[c.id] != null}
          value={listShown(c.id)}
          oninput={(e) => (drafts[c.id] = e.currentTarget.value)}
          onkeydown={(e) => e.key === 'Enter' && applyColor(c.id)}
        />
        <button onclick={() => applyColor(c.id)} disabled={drafts[c.id] == null}>Apply</button>
      </div>
    {/each}
    <div class="rowbtns">
      <button onclick={copyMarks}>Copy marks (share)</button>
      <button onclick={downloadMarks}>Download .json</button>
      <button class="danger" onclick={clearAllMarks}>Clear all marks</button>
      {#if exportMsg}<span class="hint">{exportMsg}</span>{/if}
    </div>
  </section>

  <section>
    <h3>Alerts</h3>
    <label>
      <input type="checkbox" bind:checked={settings.alerts.dropEnabled} />
      marked rider dropped from their group
    </label>
    <label>
      <input type="checkbox" bind:checked={settings.alerts.gapEnabled} />
      gap opening/closing by at least
      <select bind:value={settings.alerts.gapThreshold}>
        {#each [5, 10, 15, 20] as v}<option value={v}>{v}</option>{/each}
      </select>
      s per {settings.alerts.gapWindow}s
    </label>
    <label>
      <input type="checkbox" bind:checked={settings.alerts.breakEnabled} />
      front of the race changes (break caught, riders joining/dropping)
    </label>
    <p class="hint">Alerts show as toasts and each type has its own beep (if sound is on).</p>
  </section>

  <section>
    <h3>Stage profile</h3>
    <p class="hint">
      Altimetry CSV URL for today's stage ({stageDate || '…'}). To find it: open
      racecenter.letour.fr during a stage, DevTools → Network, filter <code>profil</code>,
      copy the CSV URL and paste it here.
    </p>
    <input
      type="text"
      class="wide"
      placeholder="/profils/{YEAR}/profile-NN-….csv or full URL"
      bind:value={settings.profileUrls[stageDate]}
    />
  </section>

  <section>
    <h3>Replay</h3>
    <p class="hint">
      Past stages download on demand (⟲ in the toolbar) and are cached here so they
      don't re-download. Delete any you no longer need to free space.
    </p>
    {#if cachedRecs.length}
      <p class="hint">Cached recordings:</p>
      {#each cachedRecs as rec (rec.id)}
        <div class="bulkrow">
          <span class="count" style="min-width:auto">{fmtSize(rec.bytes)}</span>
          <span style="flex:1; font-size:13px">{rec.entry?.name ?? rec.id}</span>
          <button class="danger" onclick={() => removeCached(rec.id)}>Delete</button>
        </div>
      {/each}
    {:else}
      <p class="hint">no recordings cached yet</p>
    {/if}
  </section>

  <section>
    <h3>Data discovery <small>(dev)</small></h3>
    <p class="hint">Every SSE bind seen this session, with a sample payload — useful to map what the feed offers.</p>
    {#if Object.keys(discovery.binds).length === 0}
      <p class="hint">nothing received yet</p>
    {:else}
      {#each Object.entries(discovery.binds) as [bind, info] (bind)}
        <details>
          <summary><code>{bind}</code> · {info.count}× · last {info.lastAt}</summary>
          <pre>{info.sample}</pre>
        </details>
      {/each}
      <button onclick={() => navigator.clipboard.writeText(discoveryDump())}>Copy all samples</button>
    {/if}
    <p>
      <button onclick={dumpStageApi}>Dump stage API (search profile URLs)</button>
    </p>
    {#if stageApiDump}<pre>{stageApiDump}</pre>{/if}
  </section>

  <section>
    <h3>Import marks</h3>
    <p class="hint">
      Paste a shared export ({'{'}"marks": …{'}'}) or the old console script's settings
      (<code>copy(localStorage.getItem('racecenter.letour.fr-2026-settings'))</code>).
      Imported marks are merged over yours.
    </p>
    <textarea rows="3" bind:value={importText} placeholder="paste marks/settings JSON"></textarea>
    <button onclick={doImport} disabled={!importText.trim()}>Import</button>
    {#if importMsg}<p class="hint">{importMsg}</p>{/if}
  </section>
</div>

<style>
  .panel {
    padding: 12px;
    max-width: 640px;
    display: grid;
    gap: 18px;
  }
  h3 {
    margin: 0 0 8px;
    font-size: 14px;
    border-bottom: 1px solid #ba4a19;
    background: #fee5d9;
    padding: 4px 6px;
  }
  label {
    display: block;
    padding: 3px 0;
    font-size: 13px;
  }
  select,
  input[type='text'],
  textarea {
    font-family: inherit;
    font-size: 13px;
  }
  .hint {
    font-size: 12px;
    color: #777;
    margin: 4px 0;
  }
  .bulkrow {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 2px 0;
  }
  .bulkrow input {
    flex: 1;
  }
  .dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.3);
    flex-shrink: 0;
  }
  button {
    font-family: inherit;
    border: 1px solid #ba4a19;
    background: #fff;
    color: #ba4a19;
    border-radius: 4px;
    padding: 3px 10px;
    cursor: pointer;
  }
  button:hover {
    background: #fee5d9;
  }
  .danger {
    border-color: #c62828;
    color: #c62828;
  }
  .count {
    font-size: 11px;
    color: #999;
    min-width: 20px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .bulkrow input.dirty {
    border-color: #b26a00;
    outline: 1px solid #b26a00;
  }
  .rowbtns {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
    flex-wrap: wrap;
  }
  textarea,
  input.wide {
    width: 100%;
    box-sizing: border-box;
  }
  pre {
    max-height: 240px;
    overflow: auto;
    background: #f4f4f2;
    border: 1px solid #e0e0dc;
    padding: 6px;
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-all;
  }
  details summary {
    cursor: pointer;
    font-size: 12px;
    padding: 2px 0;
  }
</style>
