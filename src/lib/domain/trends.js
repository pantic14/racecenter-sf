// @ts-check

/**
 * Rolling gap-trend tracker per group: is each group's gap to the group ahead
 * opening ('up'), closing ('down') or steady (null) over the last ~30 s?
 * Used for the arrows in the list view; alerts have their own (stricter) rule.
 */
export function createTrendTracker({ windowS = 30, thresholdS = 5 } = {}) {
  /** @type {Map<string, {t: number, gap: number}[]>} */
  const history = new Map();

  /**
   * @param {import('./grouping.js').Group[]} groups tracked groups of this tick
   * @param {number} t tick timestamp (unix seconds)
   * @returns {Record<string, 'up'|'down'|null>} trend per group id
   */
  function update(groups, t) {
    /** @type {Record<string, 'up'|'down'|null>} */
    const trends = {};
    const seen = new Set();
    for (let i = 1; i < groups.length; i++) {
      const group = groups[i];
      seen.add(group.id);
      const hist = history.get(group.id) ?? [];
      hist.push({ t, gap: group.gapToPrevious });
      while (hist.length > 1 && t - hist[0].t > windowS + 5) hist.shift();
      history.set(group.id, hist);

      trends[group.id] = null;
      if (t - hist[0].t >= windowS * 0.8) {
        const delta = group.gapToPrevious - hist[0].gap;
        if (delta >= thresholdS) trends[group.id] = 'up';
        else if (delta <= -thresholdS) trends[group.id] = 'down';
      }
    }
    for (const id of [...history.keys()]) {
      if (!seen.has(id)) history.delete(id);
    }
    return trends;
  }

  return { update };
}
