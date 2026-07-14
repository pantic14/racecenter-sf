import React from "react";
import { C } from "../theme";
import { prettyTime } from "../theme";
import { MARK_BG, type Chip } from "../data";

// Mirrors src/views/RiderChip.svelte
export const RiderChip: React.FC<{ chip: Chip; slow?: boolean }> = ({
  chip,
  slow,
}) => {
  const mark = chip.mark ? MARK_BG[chip.mark] : null;
  const bg = slow ? C.slowBg : mark ? mark.bg : "#fff";
  const fg = slow ? C.slowFg : mark ? mark.fg : C.ink;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: "1px solid #ddd",
        borderRadius: 6,
        background: bg,
        color: fg,
        padding: "5px 10px",
        fontSize: 21,
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          background: "#fff",
          color: "#000",
          border: "1px solid #000",
          fontSize: 15,
          padding: "0 4px",
          borderRadius: 3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {chip.bib}
      </span>
      <span style={{ fontWeight: 600 }}>{chip.name}</span>
      <span
        style={{
          opacity: 0.6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {chip.gap > 0 ? prettyTime(chip.gap) : ""}
      </span>
    </span>
  );
};
