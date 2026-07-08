// @ts-check

// Pure helpers over the marks map ({bib -> colorId}); the settings store owns
// the actual reactive object and passes it (or a snapshot) in.

/**
 * "1, 51,61" -> [1, 51, 61] (invalid entries dropped, deduped, sorted)
 * @param {string} text
 * @returns {number[]}
 */
export function parseBibList(text) {
  const seen = new Set();
  for (const part of (text ?? '').split(',')) {
    const bib = parseInt(part.trim(), 10);
    if (Number.isFinite(bib) && bib > 0) seen.add(bib);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * Bibs currently marked with a color, sorted.
 * @param {Record<string, string>} marks
 * @param {string} colorId
 * @returns {number[]}
 */
export function bibsForColor(marks, colorId) {
  return Object.entries(marks)
    .filter(([, c]) => c === colorId)
    .map(([bib]) => Number(bib))
    .sort((a, b) => a - b);
}

/**
 * Make `colorId`'s marks exactly match `bibs`: adds the listed ones (stealing
 * them from other colors) and unmarks this color's bibs missing from the list.
 * Mutates `marks`.
 * @param {Record<string, string>} marks
 * @param {string} colorId
 * @param {number[]} bibs
 */
export function syncColorList(marks, colorId, bibs) {
  const wanted = new Set(bibs.map(String));
  for (const [bib, c] of Object.entries(marks)) {
    if (c === colorId && !wanted.has(bib)) delete marks[bib];
  }
  for (const bib of wanted) marks[bib] = colorId;
}

/**
 * Serialize marks for sharing.
 * @param {Record<string, string>} marks
 * @param {string} raceKey
 */
export function exportMarks(marks, raceKey) {
  return JSON.stringify({ app: 'racecenter-peloton', race: raceKey, marks }, null, 1);
}

/**
 * Import marks from either our export format ({marks}) or the legacy console
 * script's settings ({riders: [{color}...], min_gap, ...}). Merges into
 * `marks` (imported entries win). Returns what was recognized.
 * @param {Record<string, string>} marks  mutated
 * @param {string} text
 * @returns {{count: number, legacy: {minGap?: number, maxSlowSpeed?: number, myColor?: string}}}
 */
export function importMarks(marks, text) {
  const parsed = JSON.parse(text);
  let count = 0;
  /** @type {{minGap?: number, maxSlowSpeed?: number, myColor?: string}} */
  const legacy = {};

  if (parsed && typeof parsed.marks === 'object' && parsed.marks !== null) {
    for (const [bib, color] of Object.entries(parsed.marks)) {
      if (typeof color === 'string') {
        marks[bib] = color;
        count++;
      }
    }
  } else if (parsed && parsed.riders) {
    for (const [bib, v] of Object.entries(parsed.riders)) {
      if (v?.color) {
        marks[bib] = v.color === 'white' ? 'grey' : v.color;
        count++;
      }
    }
    if (parsed.min_gap) legacy.minGap = Number(parsed.min_gap);
    if (parsed.max_slow_speed) legacy.maxSlowSpeed = Number(parsed.max_slow_speed);
    if (parsed.mycolor) legacy.myColor = parsed.mycolor;
  } else {
    throw new Error('unrecognized format: expected {"marks": …} or the legacy settings JSON');
  }
  return { count, legacy };
}
