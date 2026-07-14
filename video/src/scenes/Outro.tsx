import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C } from "../theme";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({ frame: frame - 10, fps, config: { damping: 12 }, durationInFrames: 30 });
  const wordOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  const ctaScale = interpolate(pop, [0, 1], [0.7, 1]);
  const subOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", gap: 40 }}
    >
      <div
        style={{
          fontSize: 118,
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
          display: "inline-flex",
          alignItems: "center",
          gap: 14,
          background: C.liveAccent,
          color: "#fff",
          fontSize: 40,
          fontWeight: 800,
          padding: "20px 44px",
          borderRadius: 999,
          boxShadow: "0 20px 50px rgba(186,74,25,0.45)",
        }}
      >
        Add to Chrome
      </div>

      <div
        style={{
          opacity: subOpacity,
          fontSize: 28,
          fontWeight: 600,
          color: "rgba(255,255,255,0.7)",
          letterSpacing: "0.01em",
        }}
      >
        Free · No account · Your data never leaves your browser
      </div>
    </AbsoluteFill>
  );
};
