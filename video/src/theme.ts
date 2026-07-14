// Palette lifted 1:1 from the real Racecenter UI (src/lib/colors.js + component CSS)
// so the recreated panels match the extension exactly.

export const C = {
  paper: "#fafaf8",
  ink: "#222",
  liveAccent: "#ba4a19", // group divider / gap
  replayAccent: "#6a1b9a", // replay theme
  replayBg: "#ede7f6",
  kph: "#1565c0",
  slowBg: "#000",
  slowFg: "#fff",
  up: "#c62828",
  down: "#2e7d32",
  muted: "#555",
  faint: "#999",
  // stage backdrop (dark warm) — makes the light UI panel pop in the promo
  stageTop: "#211c18",
  stageBottom: "#0c0a08",
};

export const FONT =
  'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const rgb = (c: number[]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

function scale(stops: [number, number[]][], v: number): string {
  if (v <= stops[0][0]) return rgb(stops[0][1]);
  const last = stops[stops.length - 1];
  if (v >= last[0]) return rgb(last[1]);
  for (let i = 1; i < stops.length; i++) {
    const [x1, c1] = stops[i];
    if (v <= x1) {
      const [x0, c0] = stops[i - 1];
      const t = (v - x0) / (x1 - x0);
      return rgb([lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)]);
    }
  }
  return rgb(last[1]);
}

const GRADE_STOPS: [number, number[]][] = [
  [-10, [13, 71, 161]], [-5, [100, 181, 246]], [0, [158, 158, 158]],
  [3, [253, 216, 53]], [6, [239, 83, 80]], [9, [183, 28, 28]],
  [10, [171, 71, 188]], [15, [74, 20, 140]],
];
const VAM_STOPS: [number, number[]][] = [
  [0, [158, 158, 158]], [800, [124, 179, 66]], [1200, [69, 174, 81]],
  [1600, [255, 160, 0]], [1900, [229, 57, 53]],
];

export const gradeColor = (g: number) => scale(GRADE_STOPS, g);
export const vamColor = (v: number) => scale(VAM_STOPS, v);

/** mm:ss gap formatting, matching prettyTime in the app. */
export function prettyTime(sec: number): string {
  if (sec == null || !isFinite(sec)) return "";
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}
