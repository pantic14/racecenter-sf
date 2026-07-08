// @ts-check

// IndexedDB log of one compact group summary per tick (~300 B). Recording
// starts in M1 so the gap-history view (M4) has data from day one.

const DB_NAME = 'racecenter-peloton';
const STORE = 'groupHistory';

/** @type {Promise<IDBDatabase>|null} */
let dbPromise = null;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { autoIncrement: true });
      store.createIndex('stage', 'stage');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/**
 * @param {string} stage  stage date 'yyyy-mm-dd' (or 'mock:<fixture>' in mock mode)
 * @param {number} t  tick timestamp (unix seconds)
 * @param {import('../domain/grouping.js').Group[]} groups
 */
export async function logGroups(stage, t, groups) {
  const d = await db();
  d.transaction(STORE, 'readwrite')
    .objectStore(STORE)
    .put({
      stage,
      t,
      groups: groups.map((g) => ({ id: g.id, gap: g.gapToLeader, km: g.kmToFinish, size: g.size })),
    });
}

/** @param {string} stage */
export async function getStageHistory(stage) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction(STORE).objectStore(STORE).index('stage').getAll(stage);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** @param {string} stage */
export async function clearStage(stage) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const idx = d.transaction(STORE, 'readwrite').objectStore(STORE).index('stage');
    const req = idx.openCursor(IDBKeyRange.only(stage));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else resolve(undefined);
    };
    req.onerror = () => reject(req.error);
  });
}
