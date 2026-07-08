// @ts-check

/** @param {number} s seconds @returns {string} m:ss */
export function prettyTime(s) {
  const minutes = Math.floor(s / 60);
  const seconds = Math.round(s - minutes * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
