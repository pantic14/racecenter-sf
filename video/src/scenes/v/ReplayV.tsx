import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Panel } from "../../ui/Panel";
import { GroupRow } from "../../ui/GroupRow";
import { ScrubBar } from "../../ui/ScrubBar";
import { Callout } from "../../ui/Stage";
import { C } from "../../theme";
import { BREAK, CHASE } from "../../data";

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");

export const ReplayV: React.FC = () => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [8, 120], [0.18, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const secs = interpolate(
    progress,
    [0, 1],
    [15 * 3600 + 12 * 60, 16 * 3600 + 41 * 60],
  );
  const clockTime = `${pad(secs / 3600)}:${pad((secs % 3600) / 60)}:${pad(secs % 60)}`;
  const km = interpolate(progress, [0, 1], [44.0, 1.2]).toFixed(1);

  const calloutY = interpolate(frame, [0, 24], [-40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panelY = interpolate(frame, [10, 34], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 70,
        padding: "0 40px",
      }}
    >
      <div style={{ transform: `translateY(${calloutY}px)`, textAlign: "center" }}>
        <Callout
          kicker="Never miss a move"
          accent={C.replayAccent}
          fontSize={92}
          kickerSize={34}
          lines={[
            "Replay any stage,",
            <span key="l" style={{ color: "#a05ad0" }}>
              moment by moment
            </span>,
          ]}
          style={{ maxWidth: 1000 }}
        />
      </div>

      <div style={{ transform: `translateY(${panelY}px)` }}>
        <Panel width={1010} replay>
          <ScrubBar
            progress={progress}
            playing
            speed={10}
            clock={`${clockTime} · ${km} km`}
          />
          <GroupRow
            label="Head of race"
            size={2}
            gapToLeader={0}
            kph={41}
            km={Number(km)}
            gradient={4.5}
            riders={BREAK.slice(0, 2)}
          />
          <GroupRow
            label="Chasers"
            size={5}
            gapToLeader={28}
            kph={42}
            km={Number(km) + 0.3}
            trend="down"
            riders={CHASE.slice(0, 5)}
          />
        </Panel>
      </div>
    </AbsoluteFill>
  );
};
