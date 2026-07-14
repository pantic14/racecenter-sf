import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT } from "../theme";

// Persistent dark warm backdrop shared by every scene so cuts never flash.
export const Stage: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => (
  <AbsoluteFill
    style={{
      fontFamily: FONT,
      background: `radial-gradient(120% 120% at 30% 20%, ${C.stageTop} 0%, ${C.stageBottom} 70%)`,
    }}
  >
    {/* faint accent glow */}
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(50% 45% at 78% 30%, rgba(186,74,25,0.18) 0%, rgba(186,74,25,0) 60%)",
      }}
    />
    {children}
  </AbsoluteFill>
);

// Marketing copy block. `highlight` word(s) are painted in the accent color.
export const Callout: React.FC<{
  kicker: string;
  lines: React.ReactNode[];
  accent?: string;
  fontSize?: number;
  kickerSize?: number;
  style?: React.CSSProperties;
}> = ({
  kicker,
  lines,
  accent = C.liveAccent,
  fontSize = 62,
  kickerSize = 24,
  style,
}) => (
  <div style={{ maxWidth: 620, ...style }}>
    <div
      style={{
        color: accent,
        fontWeight: 800,
        letterSpacing: "0.18em",
        fontSize: kickerSize,
        textTransform: "uppercase",
        marginBottom: 18,
      }}
    >
      {kicker}
    </div>
    {lines.map((l, i) => (
      <div
        key={i}
        style={{
          color: "#fff",
          fontWeight: 800,
          fontSize,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {l}
      </div>
    ))}
  </div>
);
