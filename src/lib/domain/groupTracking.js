// @ts-check

/**
 * Give groups a stable identity across ticks so alerts and gap history can
 * follow "the breakaway" or "the peloton" even as riders come and go.
 *
 * Greedy best-overlap matching: each new group inherits the id of the previous
 * group it shares the most riders with (Jaccard >= 0.5); otherwise a fresh id.
 */

let nextId = 1;

/**
 * @param {import('./grouping.js').Group[]} prevGroups  last tick's groups (with ids)
 * @param {import('./grouping.js').Group[]} groups  this tick's groups (ids empty)
 * @returns {import('./grouping.js').Group[]} groups, with ids assigned
 */
export function trackGroups(prevGroups, groups) {
  /** @type {[number, number, number][]} [jaccard, prevIdx, currIdx] */
  const candidates = [];
  prevGroups.forEach((prev, pi) => {
    const prevBibs = new Set(prev.riders.map((r) => r.bib));
    groups.forEach((group, gi) => {
      let common = 0;
      for (const r of group.riders) if (prevBibs.has(r.bib)) common++;
      const jaccard = common / (prevBibs.size + group.size - common);
      if (jaccard >= 0.5) candidates.push([jaccard, pi, gi]);
    });
  });

  candidates.sort((a, b) => b[0] - a[0]);
  const takenPrev = new Set();
  const takenCurr = new Set();
  for (const [, pi, gi] of candidates) {
    if (takenPrev.has(pi) || takenCurr.has(gi)) continue;
    takenPrev.add(pi);
    takenCurr.add(gi);
    groups[gi].id = prevGroups[pi].id;
  }
  for (const group of groups) {
    if (!group.id) group.id = `g${nextId++}`;
  }
  return groups;
}
