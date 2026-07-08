// @ts-check

/**
 * @typedef {Object} Group
 * @property {string} id  stable across ticks (assigned by trackGroups)
 * @property {import('../data/tick.js').RiderTick[]} riders
 * @property {number} size
 * @property {number} gapToLeader  seconds behind the head of the race
 * @property {number} gapToPrevious  seconds behind the previous group
 * @property {number} kmToFinish  of the group's first rider
 */

/**
 * Split riders (already sorted by secToFirstRider) into groups wherever the
 * gap between consecutive riders exceeds minGap seconds.
 *
 * Note: previousGap only advances for gaps > 0 — riders reporting a 0/invalid
 * gap mid-field must not create phantom splits.
 *
 * @param {import('../data/tick.js').RiderTick[]} riders
 * @param {number} minGap seconds
 * @returns {Group[]}
 */
export function groupRiders(riders, minGap) {
  /** @type {Group[]} */
  const groups = [];
  /** @type {import('../data/tick.js').RiderTick[]} */
  let current = [];
  let previousGap = 0;

  for (const rider of riders) {
    const gap = rider.secToFirstRider;
    if (current.length > 0 && gap - previousGap > minGap) {
      groups.push(buildGroup(current));
      current = [];
    }
    current.push(rider);
    if (gap > 0) previousGap = gap;
  }
  if (current.length > 0) groups.push(buildGroup(current));

  for (let i = 1; i < groups.length; i++) {
    groups[i].gapToPrevious = groups[i].gapToLeader - groups[i - 1].gapToLeader;
  }
  return groups;
}

/** @param {import('../data/tick.js').RiderTick[]} riders */
function buildGroup(riders) {
  return {
    id: '',
    riders,
    size: riders.length,
    gapToLeader: riders[0].secToFirstRider,
    gapToPrevious: 0,
    kmToFinish: riders[0].kmToFinish,
  };
}
