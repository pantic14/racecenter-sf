// @ts-check

/**
 * @typedef {Object} RelativeWind
 * @property {number} relAngle  0..360, where the wind comes FROM relative to travel (0 = dead ahead)
 * @property {number} arrowDeg  rotation (deg, clockwise) for a "↑" glyph (up = ahead) so it points where
 *                              the wind PUSHES (downwind) — matches letour's arrow: tailwind → ↑, headwind → ↓.
 * @property {'head'|'tail'|'cross-left'|'cross-right'} kind  color family (head/tail/cross)
 * @property {string} label     8-way human label describing where the wind comes from
 */

// 8 sectors of 45°, centred on relAngle 0,45,…,315 (where the wind comes FROM).
const LABELS = [
  'headwind',   // 0    from dead ahead
  'head-right', // 45   from ahead-right
  'cross R',    // 90   from the right
  'tail-right', // 135  from behind-right
  'tailwind',   // 180  from dead behind
  'tail-left',  // 225  from behind-left
  'cross L',    // 270  from the left
  'head-left',  // 315  from ahead-left
];
/** @type {RelativeWind['kind'][]} */
const KINDS = [
  'head',
  'head',
  'cross-right',
  'tail',
  'tail',
  'tail',
  'cross-left',
  'head',
];

/**
 * Classify the wind relative to a group's travel direction.
 *
 * `windFromDeg` is meteorological (the compass bearing the wind blows FROM);
 * `headingDeg` is the direction of travel. Both 0 = north, clockwise.
 *
 * @param {number} windFromDeg
 * @param {number} headingDeg
 * @returns {RelativeWind}
 */
export function classifyWind(windFromDeg, headingDeg) {
  const relAngle = (((windFromDeg - headingDeg) % 360) + 360) % 360;
  // The arrow points where the wind PUSHES (downwind), like letour's: a ↑ glyph
  // (up = ahead) rotated by relAngle+180. Tailwind (from 180) → up, headwind → down,
  // from the right (90) → pushes/points left, from the left (270) → points right.
  const arrowDeg = (relAngle + 180) % 360;

  const sector = Math.round(relAngle / 45) % 8;
  return { relAngle, arrowDeg, kind: KINDS[sector], label: LABELS[sector] };
}
