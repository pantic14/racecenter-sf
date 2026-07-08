// @ts-check

/**
 * Data-discovery collector: records every SSE `bind` seen on /live-stream
 * with a sample payload, to map what the feed offers beyond rider telemetry
 * (candidate binds seen in the site bundle: telemetryPack, pack-*, allGroups-*,
 * favorite-*, memo-*, home-*). Shown in Settings → Data discovery.
 */
export const discovery = $state({
  /** @type {Record<string, {count: number, lastAt: string, sample: string}>} */
  binds: {},
});

/** @param {string} rawData verbatim SSE `update` data string */
export function recordRawUpdate(rawData) {
  let bind = '(unparseable)';
  try {
    bind = JSON.parse(rawData).bind ?? '(no bind)';
  } catch {
    // keep '(unparseable)'
  }
  const entry = discovery.binds[bind];
  if (entry) {
    entry.count++;
    entry.lastAt = new Date().toLocaleTimeString();
  } else {
    discovery.binds[bind] = {
      count: 1,
      lastAt: new Date().toLocaleTimeString(),
      sample: rawData.length > 3000 ? rawData.slice(0, 3000) + '…' : rawData,
    };
  }
}

export function discoveryDump() {
  return JSON.stringify(discovery.binds, null, 1);
}
