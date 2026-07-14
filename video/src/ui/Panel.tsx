import React from "react";
import { C, FONT } from "../theme";

// A stylized extension side-panel card. `replay` swaps the header accent to the
// purple replay theme.
export const Panel: React.FC<{
  width?: number;
  children: React.ReactNode;
  replay?: boolean;
}> = ({ width = 900, children, replay }) => {
  const accent = replay ? C.replayAccent : C.liveAccent;
  return (
    <div
      style={{
        width,
        background: C.paper,
        color: C.ink,
        borderRadius: 18,
        overflow: "hidden",
        fontFamily: FONT,
        boxShadow: "0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)",
      }}
    >
      {/* window chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 18px",
          background: "#efece7",
          borderBottom: "1px solid #e0dcd4",
        }}
      >
        <Dot color="#ff5f57" />
        <Dot color="#febc2e" />
        <Dot color="#28c840" />
        <span
          style={{
            marginLeft: 12,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          <span style={{ color: accent }}>Race</span>center
        </span>
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 16,
            color: replay ? C.replayAccent : C.down,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: replay ? C.replayAccent : C.down,
            }}
          />
          {replay ? "REPLAY" : "LIVE"}
        </span>
      </div>
      {children}
    </div>
  );
};

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <span
    style={{ width: 13, height: 13, borderRadius: "50%", background: color }}
  />
);
