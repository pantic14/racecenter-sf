// @ts-check
import { RACE_KEY } from '../config.js';
import { storageGet, storageSet } from '../storage/chromeStorage.js';

const KEY = `settings:${RACE_KEY}`;

const defaults = {
  minGap: 4,
  maxSlowSpeed: 5,
  beepForAll: false,
  soundOn: true,
  myColor: '#ff4500',
  /** @type {Record<string, string>} bib -> color id */
  marks: {},
  /** @type {Record<string, string>} color id -> last bulk input */
  bulkInputs: {},
};

export const settings = $state(structuredClone(defaults));
export const settingsMeta = $state({ loaded: false });

export async function initSettings() {
  const saved = await storageGet(KEY, null);
  if (saved) Object.assign(settings, { ...structuredClone(defaults), ...saved });
  settingsMeta.loaded = true;
}

/** Called from an $effect with $state.snapshot(settings); debounced inside. */
export function persistSettings(snapshot) {
  if (!settingsMeta.loaded) return; // never overwrite saved data with defaults
  storageSet(KEY, snapshot);
}
