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
