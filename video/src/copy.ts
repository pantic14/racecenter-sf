import { createContext, useContext } from "react";

// Bilingual copy for the commentator pitch. Lines are plain strings; scenes
// decide which line gets the accent color. Edit text here to tweak wording.

export type Lang = "es" | "en";

export type Copy = {
  problem: { kicker: string; lines: string[] };
  solution: { lines: string[] };
  groups: { kicker: string; lines: string[] };
  split: { kicker: string; lines: string[] };
  position: { kicker: string; lines: string[] };
  details: { kicker: string; lines: string[] };
  close: { lines: string[]; cta: string; sub: string };
};

export const COPY: Record<Lang, Copy> = {
  es: {
    problem: {
      kicker: "Narrando en directo",
      lines: ["Qué corredor ataca.", "Quién va en cada grupo.", "Hoy… lo intuyes."],
    },
    solution: { lines: ["Toda la carrera,", "de un vistazo."] },
    groups: {
      kicker: "Cada grupo",
      lines: ["Quién va en cada grupo,", "con nombre y dorsal."],
    },
    split: {
      kicker: "Sin sorpresas",
      lines: ["La carrera se rompe", "y lo ves al instante."],
    },
    position: {
      kicker: "Posición real",
      lines: ["El orden dentro del grupo", "y el hueco de cada uno."],
    },
    details: {
      kicker: "Lo que no se ve",
      lines: ["VAM, pendiente, viento y Tª —", "de un solo vistazo."],
    },
    close: {
      lines: ["Deja de intuir.", "Nárralo con datos."],
      cta: "Gratis en Chrome",
      sub: "Hecho para narrar ciclismo en directo",
    },
  },
  en: {
    problem: {
      kicker: "Live on air",
      lines: ["Which rider attacks.", "Who's in each group.", "Today… you guess."],
    },
    solution: { lines: ["The whole race,", "at a glance."] },
    groups: {
      kicker: "Every group",
      lines: ["Exactly who's in each group,", "by name and number."],
    },
    split: {
      kicker: "No surprises",
      lines: ["The race splits", "and you see it live."],
    },
    position: {
      kicker: "Real positions",
      lines: ["The order within the group", "and every rider's gap."],
    },
    details: {
      kicker: "Details you can't see",
      lines: ["VAM, gradient, wind & temp —", "all at a glance."],
    },
    close: {
      lines: ["Stop guessing.", "Narrate with data."],
      cta: "Free on Chrome",
      sub: "Built for live cycling commentary",
    },
  },
};

export const LangContext = createContext<Lang>("es");
export const useCopy = (): Copy => COPY[useContext(LangContext)];
