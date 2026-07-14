import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C } from "../../theme";
import { useCopy } from "../../copy";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Close: the payoff line + wordmark + CTA aimed at broadcasters.
export const CloseC: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useCopy();

  const l0 = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const l1 = interpolate(frame, [12, 28], [0, 1], clamp);
  const wordOpacity = interpolate(frame, [26, 42], [0, 1], clamp);
  const pop = spring({ frame: frame - 34, fps, config: { damping: 13 }, durationInFrames: 26 });
  const ctaScale = interpolate(pop, [0, 1], [0.7, 1]);
  const subOpacity = interpolate(frame, [52, 70], [0, 1], clamp);

  const head = { fontWeight: 900, fontSize: 92, lineHeight: 1.02, letterSpacing: "-0.03em" };

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 34 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ ...head, color: "#fff", opacity: l0 }}>{t.close.lines[0]}</div>
        <div style={{ ...head, color: "#ff7a2f", opacity: l1 }}>{t.close.lines[1]}</div>
      </div>

      <div
        style={{
          marginTop: 20,
          fontSize: 76,
          fontWeight: 900,
          letterSpacing: "-0.03em",
          color: "#fff",
          opacity: wordOpacity,
        }}
      >
        <span style={{ color: C.liveAccent }}>Race</span>center
      </div>

      <div
        style={{
          transform: `scale(${ctaScale})`,
          background: C.liveAccent,
          color: "#fff",
          fontSize: 38,
          fontWeight: 800,
          padding: "18px 44px",
          borderRadius: 999,
          boxShadow: "0 20px 50px rgba(186,74,25,0.45)",
        }}
      >
        {t.close.cta}
      </div>

      <div style={{ opacity: subOpacity, fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
        {t.close.sub}
      </div>
    </AbsoluteFill>
  );
};
