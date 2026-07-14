import React from "react";
import { C } from "../theme";

// Mirrors the transport controls in src/views/ReplayBar.svelte
export const ScrubBar: React.FC<{
  progress: number; // 0..1
  playing: boolean;
  speed: number;
  clock: string;
}> = ({ progress, playing, speed, clock }) => {
  const SPEEDS = [1, 5, 10, 30, 60];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: C.replayBg,
        borderBottom: `2px solid ${C.replayAccent}`,
        padding: "12px 18px",
        fontSize: 20,
        color: C.replayAccent,
      }}
    >
      <Badge>REPLAY</Badge>
      <Btn>{playing ? "⏸" : "⏵"}</Btn>
      <div style={{ display: "flex", gap: 4 }}>
        {SPEEDS.map((s) => (
          <Btn key={s} active={s === speed}>
            {s}×
          </Btn>
        ))}
      </div>
      {/* scrubber track */}
      <div style={{ flex: 1, position: "relative", height: 8 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 4,
            background: "#d7c7e8",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            borderRadius: 4,
            background: C.replayAccent,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${progress * 100}%`,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: C.replayAccent,
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 4px rgba(106,27,154,0.2)",
          }}
        />
      </div>
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          color: "#4a148c",
          minWidth: 220,
          textAlign: "right",
        }}
      >
        {clock}
      </span>
    </div>
  );
};

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      background: C.replayAccent,
      color: "#fff",
      borderRadius: 12,
      padding: "3px 12px",
      fontSize: 16,
      fontWeight: 700,
    }}
  >
    {children}
  </span>
);

const Btn: React.FC<{ children: React.ReactNode; active?: boolean }> = ({
  children,
  active,
}) => (
  <span
    style={{
      border: `1px solid ${C.replayAccent}`,
      background: active ? C.replayAccent : "#fff",
      color: active ? "#fff" : C.replayAccent,
      borderRadius: 6,
      padding: "5px 11px",
      fontVariantNumeric: "tabular-nums",
    }}
  >
    {children}
  </span>
);
