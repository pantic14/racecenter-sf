import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C } from "../theme";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 40 });
  const y = interpolate(enter, [0, 1], [40, 0]);
  const wordmarkOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const underline = interpolate(frame, [22, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineOpacity = interpolate(frame, [34, 52], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `translateY(${y}px)`, textAlign: "center" }}>
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#fff",
            opacity: wordmarkOpacity,
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
            margin: "18px auto 0",
            maxWidth: 720,
          }}
        />
        <div
          style={{
            marginTop: 34,
            fontSize: 34,
            fontWeight: 600,
            color: "rgba(255,255,255,0.82)",
            opacity: taglineOpacity,
          }}
        >
          Live peloton tracking, right in your browser
        </div>
      </div>
    </AbsoluteFill>
  );
};
