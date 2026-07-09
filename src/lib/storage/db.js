// @ts-check

// Shared IndexedDB handle for the extension. One database, opened once.
//   v1: `groupHistory` — one compact group summary per tick (M1/M4, autoIncrement).
//   v2: `recordings`   — cached stage recordings (gz blobs) for replay (M6, keyed by id).
// The upgrade is additive and idempotent so it works both on a fresh install
// (oldVersion 0 → create both) and on an existing v1 install (add `recordings`).

const DB_NAME = 'racecenter-peloton';
const DB_VERSION = 2;

/** @type {Promise<IDBDatabase>|null} */
let dbPromise = null;

/** @returns {Promise<IDBDatabase>} */
export function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('groupHistory')) {
        d.createObjectStore('groupHistory', { autoIncrement: true }).createIndex('stage', 'stage');
      }
      if (!d.objectStoreNames.contains('recordings')) {
        d.createObjectStore('recordings', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/**
 * Await a single IDBRequest.
 * @template T
 * @param {IDBRequest<T>} req
 * @returns {Promise<T>}
 */
export function reqDone(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
