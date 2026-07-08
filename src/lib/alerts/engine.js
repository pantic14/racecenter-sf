// @ts-check
import { prettyTime } from '../util.js';

/**
 * @typedef {Object} AlertEvent
 * @property {'drop'|'gap'|'break'} type
 * @property {number} at  tick timestamp (unix seconds)
 * @property {string} message
 */

/**
 * @typedef {Object} AlertConfig
 * @property {boolean} dropEnabled
 * @property {number} dropTicks  consecutive ticks before firing (debounce)
 * @property {boolean} gapEnabled
 * @property {number} gapThreshold  seconds of change that trigger a gap alert
 * @property {number} gapWindow  rolling window in seconds
 * @property {boolean} breakEnabled
 */

const GAP_COOLDOWN_S = 60;
const DROP_MIN_WORSE_S = 2; // ignore sub-noise group changes

/**
 * Stateful alert engine. Feed it every tick's tracked groups; it returns the
 * alerts that fire on that tick. All rules are debounced so one noisy tick
 * never fires anything.
 */
export function createAlertEngine() {
  /** @type {Map<number, {groupId: string, worse: number}>} per marked rider */
  const favorites = new Map();
  /** @type {Map<string, {t: number, gap: number}[]>} rolling gap history per adjacent pair */
  const pairHistory = new Map();
  /** @type {Map<string, number>} pair -> no-alerts-until timestamp */
  const pairCooldown = new Map();
  /** @type {{id: string, bibs: Set<number>}|null} current head-of-race group */
  let head = null;
  /** @type {{id: string, ticks: number}|null} */
  let headCandidate = null;
  /** @type {Map<number, number>} bib -> consecutive ticks present/absent */
  const pendingJoin = new Map();
  const pendingLeave = new Map();

  /**
   * @param {import('../domain/grouping.js').Group[]} groups  tracked groups of this tick
   * @param {number} t  tick timestamp (unix seconds)
   * @param {Record<string, string>} marks  bib -> color (marked riders = favorites)
   * @param {(bib: number) => string} nameOf
   * @param {AlertConfig} cfg
   * @returns {AlertEvent[]}
   */
  function evaluate(groups, t, marks, nameOf, cfg) {
    /** @type {AlertEvent[]} */
    const events = [];
    if (groups.length === 0) return events;

    const byId = new Map(groups.map((g) => [g.id, g]));
    /** @type {Map<number, import('../domain/grouping.js').Group>} */
    const groupOf = new Map();
    for (const g of groups) for (const r of g.riders) groupOf.set(r.bib, g);
    const largestSize = Math.max(...groups.map((g) => g.size));

    function describe(group) {
      if (group.size === largestSize && group.size >= 20) return 'the peloton';
      if (group === groups[0]) return `the front group (${group.size})`;
      return `a group of ${group.size}`;
    }

    // ---- rule 1: favorite dropped from their group -------------------------
    if (cfg.dropEnabled) {
      for (const bibStr of Object.keys(marks)) {
        const bib = Number(bibStr);
        const group = groupOf.get(bib);
        if (!group) continue;
        const st = favorites.get(bib);
        if (!st) {
          favorites.set(bib, { groupId: group.id, worse: 0 });
          continue;
        }
        if (group.id === st.groupId) {
          st.worse = 0;
          continue;
        }
        const oldGroup = byId.get(st.groupId);
        if (oldGroup && group.gapToLeader > oldGroup.gapToLeader + DROP_MIN_WORSE_S) {
          st.worse++;
          if (st.worse >= cfg.dropTicks) {
            events.push({
              type: 'drop',
              at: t,
              message: `${nameOf(bib)} dropped from ${describe(oldGroup)} — now at +${prettyTime(group.gapToLeader)}`,
            });
            st.groupId = group.id;
            st.worse = 0;
          }
        } else {
          // moved up, or the old group no longer exists: adopt silently
          st.groupId = group.id;
          st.worse = 0;
        }
      }
      for (const bib of [...favorites.keys()]) {
        if (!(String(bib) in marks)) favorites.delete(bib);
      }
    }

    // ---- rule 2: gap between adjacent groups opening/closing ---------------
    if (cfg.gapEnabled) {
      const seen = new Set();
      for (let i = 1; i < groups.length; i++) {
        const key = `${groups[i - 1].id}|${groups[i].id}`;
        seen.add(key);
        const gap = groups[i].gapToLeader - groups[i - 1].gapToLeader;
        const hist = pairHistory.get(key) ?? [];
        hist.push({ t, gap });
        while (hist.length > 1 && t - hist[0].t > cfg.gapWindow + 5) hist.shift();
        pairHistory.set(key, hist);

        if (t - hist[0].t >= cfg.gapWindow && (pairCooldown.get(key) ?? 0) <= t) {
          const delta = gap - hist[0].gap;
          if (Math.abs(delta) >= cfg.gapThreshold) {
            const dir = delta > 0 ? 'opening' : 'closing';
            events.push({
              type: 'gap',
              at: t,
              message: `Gap ${dir} between ${describe(groups[i - 1])} and ${describe(groups[i])}: ${delta > 0 ? '+' : ''}${Math.round(delta)}s in ${cfg.gapWindow}s (now +${prettyTime(gap)})`,
            });
            pairCooldown.set(key, t + GAP_COOLDOWN_S);
            pairHistory.set(key, [{ t, gap }]);
          }
        }
      }
      for (const key of [...pairHistory.keys()]) {
        if (!seen.has(key)) {
          pairHistory.delete(key);
          pairCooldown.delete(key);
        }
      }
    }

    // ---- rule 3: head of race / breakaway composition ----------------------
    if (cfg.breakEnabled) {
      const front = groups[0];
      if (!head) {
        head = { id: front.id, bibs: new Set(front.riders.map((r) => r.bib)) };
      } else if (front.id !== head.id) {
        headCandidate =
          headCandidate?.id === front.id
            ? { id: front.id, ticks: headCandidate.ticks + 1 }
            : { id: front.id, ticks: 1 };
        if (headCandidate.ticks >= cfg.dropTicks) {
          events.push({
            type: 'break',
            at: t,
            message:
              front.size === largestSize
                ? `The break is caught — ${front.size} riders together at the front`
                : `New situation at the front: ${front.size} rider${front.size > 1 ? 's' : ''} lead the race`,
          });
          head = { id: front.id, bibs: new Set(front.riders.map((r) => r.bib)) };
          headCandidate = null;
          pendingJoin.clear();
          pendingLeave.clear();
        }
      } else {
        headCandidate = null;
        const current = new Set(front.riders.map((r) => r.bib));
        for (const bib of current) {
          if (!head.bibs.has(bib)) pendingJoin.set(bib, (pendingJoin.get(bib) ?? 0) + 1);
        }
        for (const bib of [...pendingJoin.keys()]) {
          if (!current.has(bib) || head.bibs.has(bib)) pendingJoin.delete(bib);
        }
        for (const bib of head.bibs) {
          if (!current.has(bib)) pendingLeave.set(bib, (pendingLeave.get(bib) ?? 0) + 1);
        }
        for (const bib of [...pendingLeave.keys()]) {
          if (current.has(bib) || !head.bibs.has(bib)) pendingLeave.delete(bib);
        }

        const joined = [...pendingJoin].filter(([, n]) => n >= cfg.dropTicks).map(([b]) => b);
        const left = [...pendingLeave].filter(([, n]) => n >= cfg.dropTicks).map(([b]) => b);
        if (joined.length || left.length) {
          const parts = [];
          if (joined.length) parts.push(`${joined.map(nameOf).join(', ')} joined`);
          if (left.length) parts.push(`${left.map(nameOf).join(', ')} dropped`);
          events.push({
            type: 'break',
            at: t,
            message: `Front group (${front.size}): ${parts.join('; ')}`,
          });
          for (const b of joined) {
            head.bibs.add(b);
            pendingJoin.delete(b);
          }
          for (const b of left) {
            head.bibs.delete(b);
            pendingLeave.delete(b);
          }
        }
      }
    }

    return events;
  }

  return { evaluate };
}
