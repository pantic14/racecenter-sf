// @ts-check

/**
 * @typedef {Object} RelativeWind
 * @property {number} relAngle  0..360, where the wind comes FROM relative to travel (0 = dead ahead)
 * @property {number} toward    0..360, direction the wind pushes relative to travel (0 = forward), for a ↑ arrow rotation
 * @property {'head'|'tail'|'cross-left'|'cross-right'} kind
 * @property {string} label     short human label
 */

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
  // direction the wind pushes, relative to "up = forward" (for the arrow)
  const toward = (relAngle + 180) % 360;

  /** @type {RelativeWind['kind']} */
  let kind;
  let label;
  if (relAngle >= 315 || relAngle < 45) {
    kind = 'head';
    label = 'headwind';
  } else if (relAngle < 135) {
    kind = 'cross-right'; // wind comes from the rider's right
    label = 'cross ►';
  } else if (relAngle < 225) {
    kind = 'tail';
    label = 'tailwind';
  } else {
    kind = 'cross-left'; // wind comes from the rider's left
    label = 'cross ◄';
  }

  return { relAngle, toward, kind, label };
}
