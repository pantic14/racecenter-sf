// @ts-check

// chrome.storage.local in the extension; localStorage fallback for `npm run dev`.
const hasChrome = typeof chrome !== 'undefined' && !!chrome.storage?.local;

/**
 * @param {string} key
 * @param {any} fallback
 */
export async function storageGet(key, fallback) {
  try {
    if (hasChrome) {
      const found = await chrome.storage.local.get(key);
      return found[key] ?? fallback;
    }
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** @type {Map<string, any>} */
const timers = new Map();

/**
 * Debounced write (per key) so 1 Hz UI mutations don't hammer storage.
 * @param {string} key
 * @param {any} value  must be JSON-serializable (pass $state.snapshot for stores)
 */
export function storageSet(key, value, delayMs = 500) {
  clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(() => {
      if (hasChrome) chrome.storage.local.set({ [key]: value });
      else localStorage.setItem(key, JSON.stringify(value));
    }, delayMs),
  );
}
