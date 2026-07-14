import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C } from "../../theme";

export const OutroV: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12 },
    durationInFrames: 30,
  });
  const wordOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  const ctaScale = interpolate(pop, [0, 1], [0.7, 1]);
  const linkOpacity = interpolate(frame, [26, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // arrow bounces toward the description area at the bottom of the Short
  const bounce = Math.sin(frame / 6) * 12;

  return (
    <AbsoluteFill
      style={{
        flexDirection: "column",
        alignItems: "center",
        // pushed a bit above center so the pointing arrow leads the eye down
        justifyContent: "center",
        gap: 44,
        paddingBottom: 220,
      }}
    >
      <div
        style={{
          fontSize: 128,
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
          fontSize: 46,
          fontWeight: 800,
          padding: "22px 52px",
          borderRadius: 999,
          boxShadow: "0 20px 50px rgba(186,74,25,0.45)",
        }}
      >
        Free on Chrome
      </div>

      <div
        style={{
          opacity: linkOpacity,
          textAlign: "center",
          marginTop: 30,
        }}
      >
        <div
          style={{
            fontSize: 58,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.01em",
          }}
        >
          Link's in the description
        </div>
        <div
          style={{
            fontSize: 90,
            transform: `translateY(${bounce}px)`,
            marginTop: 10,
          }}
        >
          👇
        </div>
      </div>
    </AbsoluteFill>
  );
};
