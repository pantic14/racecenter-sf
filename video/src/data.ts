// Plausible race snapshot used to drive the recreated UI in the promo.
// Not real telemetry — shaped to look like a live Tour stage.

export type Chip = { bib: number; name: string; gap: number; mark?: string };

export const BREAK: Chip[] = [
  { bib: 14, name: "PEDERSEN M", gap: 0, mark: "yellow" },
  { bib: 8, name: "VAN AERT W", gap: 0 },
  { bib: 121, name: "COSNEFROY B", gap: 0, mark: "green" },
  { bib: 46, name: "HEALY B", gap: 0 },
];

export const CHASE: Chip[] = [
  { bib: 1, name: "POGAČAR T", gap: 42, mark: "orange" },
  { bib: 21, name: "VINGEGAARD J", gap: 42 },
  { bib: 31, name: "EVENEPOEL R", gap: 42, mark: "red" },
  { bib: 5, name: "ROGLIČ P", gap: 42 },
  { bib: 71, name: "GALL F", gap: 42 },
  { bib: 4, name: "ALMEIDA J", gap: 42 },
];

export const PELOTON: Chip[] = [
  { bib: 51, name: "PHILIPSEN J", gap: 214 },
  { bib: 11, name: "GANNA F", gap: 214 },
  { bib: 63, name: "MEEUS J", gap: 214 },
  { bib: 24, name: "MOHORIČ M", gap: 214 },
  { bib: 88, name: "KOOIJ O", gap: 214 },
  { bib: 92, name: "GIRMAY B", gap: 214 },
  { bib: 105, name: "TEUNS D", gap: 214 },
  { bib: 133, name: "ARENSMAN T", gap: 214 },
  { bib: 77, name: "SKJELMOSE M", gap: 214 },
  { bib: 66, name: "YATES A", gap: 214 },
];

export const MARK_BG: Record<string, { bg: string; fg: string }> = {
  yellow: { bg: "#ffd21e", fg: "#111" },
  green: { bg: "#45ae51", fg: "#fff" },
  orange: { bg: "#ff7a00", fg: "#fff" },
  red: { bg: "#e53935", fg: "#fff" },
};
