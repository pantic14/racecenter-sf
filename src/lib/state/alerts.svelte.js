// @ts-check

let nextId = 1;
const TOAST_LIFETIME_MS = 30_000;

export const alertsState = $state({
  /** @type {(import('../alerts/engine.js').AlertEvent & {id: number})[]} */
  toasts: [],
  /** @type {(import('../alerts/engine.js').AlertEvent & {id: number})[]} session log */
  log: [],
});

/** @param {import('../alerts/engine.js').AlertEvent} event */
export function pushAlert(event) {
  const item = { ...event, id: nextId++ };
  alertsState.toasts.push(item);
  if (alertsState.toasts.length > 6) alertsState.toasts.shift();
  alertsState.log.push(item);
  if (alertsState.log.length > 300) alertsState.log.shift();
  setTimeout(() => dismissAlert(item.id), TOAST_LIFETIME_MS);
}

/** @param {number} id */
export function dismissAlert(id) {
  const i = alertsState.toasts.findIndex((t) => t.id === id);
  if (i >= 0) alertsState.toasts.splice(i, 1);
}
