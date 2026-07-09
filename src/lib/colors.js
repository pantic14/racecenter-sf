// @ts-check

/** Marking palette. 'orange' uses the user's custom color from settings. */
export const MARK_COLORS = [
  { id: 'yellow', bg: '#ffd21e', fg: '#111' },
  { id: 'green', bg: '#45ae51', fg: '#fff' },
  { id: 'orange', bg: '', fg: '#fff' }, // bg = settings.myColor
  { id: 'red', bg: '#e53935', fg: '#fff' },
  { id: 'darkblue', bg: '#00008b', fg: '#fff' },
  { id: 'babyblue', bg: '#bfd7ed', fg: '#111' },
  { id: 'pink', bg: '#ffb6c1', fg: '#111' },
  { id: 'grey', bg: '#9e9e9e', fg: '#111' },
];

/**
 * @param {string} id color id from MARK_COLORS
 * @param {string} myColor settings.myColor (used for 'orange')
 * @returns {{bg: string, fg: string}|null}
 */
export function colorOf(id, myColor) {
  const c = MARK_COLORS.find((c) => c.id === id);
  if (!c) return null;
  return { bg: c.id === 'orange' ? myColor : c.bg, fg: c.fg };
}

/**
 * Road-grade color scale, anchored at percentage stops:
 * descent = blue (lighter toward 0), 0 = grey, then yellowing on the way up,
 * light red at ~6% darkening to ~9%, purple from 10% deepening beyond.
 * @type {[number, [number, number, number]][]}
 */
const GRADE_STOPS = [
  [-10, [13, 71, 161]], // strong blue
  [-5, [100, 181, 246]], // light blue
  [0, [158, 158, 158]], // grey
  [3, [253, 216, 53]], // yellow
  [6, [239, 83, 80]], // light red
  [9, [183, 28, 28]], // dark red
  [10, [171, 71, 188]], // purple
  [15, [74, 20, 140]], // deep purple
];

/**
 * Interpolated CSS color for a road grade (%).
 * @param {number} g grade in percent
 * @returns {string} rgb() string
 */
export function gradeColor(g) {
  const stops = GRADE_STOPS;
  if (g <= stops[0][0]) return rgb(stops[0][1]);
  if (g >= stops[stops.length - 1][0]) return rgb(stops[stops.length - 1][1]);
  for (let i = 1; i < stops.length; i++) {
    const [x1, c1] = stops[i];
    if (g <= x1) {
      const [x0, c0] = stops[i - 1];
      const t = (g - x0) / (x1 - x0);
      return rgb([lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)]);
    }
  }
  return rgb(stops[stops.length - 1][1]);
}

/** @param {number} a @param {number} b @param {number} t */
function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

/** @param {[number, number, number]|number[]} c */
function rgb(c) {
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
