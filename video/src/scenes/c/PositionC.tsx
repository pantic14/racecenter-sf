import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Panel } from "../../ui/Panel";
import { Callout } from "../../ui/Stage";
import { C, prettyTime } from "../../theme";
import { useCopy } from "../../copy";
import { CHASE } from "../../data";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ROW_H = 68;
// slightly increasing gaps to make on-road order legible
const RIDERS = CHASE.map((r, i) => ({ ...r, gap: 40 + i }));

// "Real positions": the order within a group + each rider's gap, with a ring
// sweeping down the on-road order.
export const PositionC: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useCopy();

  const pos = interpolate(frame, [24, 150], [0, RIDERS.length - 1], clamp);
  const panelX = interpolate(frame, [0, 24], [-50, 0], clamp);
  const calloutOpacity = interpolate(frame, [40, 64], [0, 1], clamp);
  const calloutX = interpolate(frame, [40, 64], [50, 0], clamp);

  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 90px", gap: 60 }}>
      <div style={{ transform: `translateX(${panelX}px)` }}>
        <Panel width={880}>
          <div
            style={{
              display: "flex",
              gap: 18,
              alignItems: "baseline",
              padding: "16px 22px 10px",
              borderBottom: `2px solid ${C.liveAccent}`,
              fontSize: 22,
              color: C.muted,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 26, color: C.ink }}>Chasers</span>
            <span>6 riders</span>
            <span style={{ color: C.liveAccent, fontWeight: 600 }}>+42s</span>
            <span style={{ marginLeft: "auto", fontSize: 18, color: C.faint }}>on-road order ↓</span>
          </div>

          <div style={{ position: "relative", padding: "8px 0" }}>
            {/* sweeping highlight ring */}
            <div
              style={{
                position: "absolute",
                left: 10,
                right: 10,
                top: 8 + pos * ROW_H,
                height: ROW_H,
                border: `2.5px solid ${C.liveAccent}`,
                borderRadius: 10,
                background: "rgba(186,74,25,0.07)",
              }}
            />
            {RIDERS.map((r, i) => (
              <div
                key={r.bib}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  height: ROW_H,
                  padding: "0 24px",
                  fontSize: 26,
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: C.liveAccent,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    background: "#fff",
                    color: "#000",
                    border: "1px solid #000",
                    fontSize: 18,
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {r.bib}
                </span>
                <span style={{ fontWeight: 700, flex: 1 }}>{r.name}</span>
                <span style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                  {prettyTime(r.gap)}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ transform: `translateX(${calloutX}px)`, opacity: calloutOpacity }}>
        <Callout
          kicker={t.position.kicker}
          lines={[
            t.position.lines[0],
            <span key="l" style={{ color: "#ff7a2f" }}>
              {t.position.lines[1]}
            </span>,
          ]}
        />
      </div>
    </AbsoluteFill>
  );
};
