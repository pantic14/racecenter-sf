<script>
  import { settings } from '../lib/state/settings.svelte.js';
  import { ui } from '../lib/state/ui.svelte.js';
  import { MARK_COLORS, colorOf } from '../lib/colors.js';

  let importText = $state('');
  let importMsg = $state('');

  function applyBulk(colorId) {
    const bibs = (settings.bulkInputs[colorId] ?? '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    for (const bib of bibs) settings.marks[bib] = colorId;
  }

  function clearAllMarks() {
    settings.marks = {};
  }

  function importLegacy() {
    try {
      const old = JSON.parse(importText);
      if (old.min_gap) settings.minGap = Number(old.min_gap);
      if (old.max_slow_speed) settings.maxSlowSpeed = Number(old.max_slow_speed);
      if (old.mycolor) settings.myColor = old.mycolor;
      let count = 0;
      if (old.riders) {
        for (const [bib, v] of Object.entries(old.riders)) {
          if (v?.color) {
            settings.marks[bib] = v.color === 'white' ? 'grey' : v.color;
            count++;
          }
        }
      }
      importMsg = `imported ok (${count} marked riders)`;
      importText = '';
    } catch (e) {
      importMsg = `import failed: ${e.message}`;
    }
  }
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
    <label><input type="checkbox" bind:checked={ui.showBibs} /> show bib numbers</label>
  </section>

  <section>
    <h3>Bulk marking</h3>
    <p class="hint">Comma-separated bib numbers per color (e.g. <code>1, 51, 61, 81</code>) — favorites, sprinters, today's breakaway…</p>
    {#each MARK_COLORS as c (c.id)}
      <div class="bulkrow">
        <span class="dot" style="background:{colorOf(c.id, settings.myColor).bg}" title={c.id}></span>
        <input
          type="text"
          placeholder="bibs for {c.id}"
          bind:value={settings.bulkInputs[c.id]}
        />
        <button onclick={() => applyBulk(c.id)}>Apply</button>
      </div>
    {/each}
    <button class="danger" onclick={clearAllMarks}>Clear all marks</button>
  </section>

  <section>
    <h3>Import from the old console script</h3>
    <p class="hint">
      On racecenter.letour.fr run
      <code>copy(localStorage.getItem('racecenter.letour.fr-2026-settings'))</code>
      in the console, then paste here.
    </p>
    <textarea rows="3" bind:value={importText} placeholder="paste settings JSON"></textarea>
    <button onclick={importLegacy} disabled={!importText.trim()}>Import</button>
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
    margin-top: 8px;
    border-color: #c62828;
    color: #c62828;
  }
  textarea {
    width: 100%;
  }
</style>
