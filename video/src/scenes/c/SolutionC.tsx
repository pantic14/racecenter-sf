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

// The turn: name the product, promise the whole race at a glance.
export const SolutionC: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useCopy();

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const y = interpolate(enter, [0, 1], [30, 0]);
  const wordOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const underline = interpolate(frame, [18, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `translateY(${y}px)`, textAlign: "center" }}>
        <div
          style={{
            fontSize: 130,
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
            height: 8,
            borderRadius: 4,
            background: C.liveAccent,
            width: `${underline * 100}%`,
            margin: "16px auto 0",
            maxWidth: 660,
          }}
        />
        <div style={{ marginTop: 34, opacity: tagOpacity }}>
          <span style={{ fontSize: 52, fontWeight: 800, color: "#fff" }}>{t.solution.lines[0]} </span>
          <span style={{ fontSize: 52, fontWeight: 800, color: "#ff7a2f" }}>{t.solution.lines[1]}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
