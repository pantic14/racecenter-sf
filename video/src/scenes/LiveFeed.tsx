import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Panel } from "../ui/Panel";
import { GroupRow } from "../ui/GroupRow";
import { Callout } from "../ui/Stage";
import { BREAK, CHASE, PELOTON } from "../data";

// How many chips are revealed as the frame advances (populating feel).
const revealed = <T,>(arr: T[], frame: number, start: number, per = 4) =>
  arr.slice(0, Math.max(0, Math.floor((frame - start) / per) + 1));

export const LiveFeed: React.FC = () => {
  const frame = useCurrentFrame();

  const panelX = interpolate(frame, [0, 24], [-60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const calloutX = interpolate(frame, [40, 64], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const calloutOpacity = interpolate(frame, [40, 64], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: "0 90px",
        gap: 60,
      }}
    >
      <div style={{ transform: `translateX(${panelX}px)` }}>
        <Panel width={940}>
          <GroupRow
            label="Head of race"
            size={4}
            gapToLeader={0}
            kph={46}
            km={38.4}
            riders={revealed(BREAK, frame, 4)}
          />
          <GroupRow
            label="Chasers"
            size={6}
            gapToLeader={42}
            kph={45}
            km={38.9}
            trend="down"
            riders={revealed(CHASE, frame, 14)}
          />
          <GroupRow
            label="Peloton"
            size={132}
            gapToLeader={214}
            kph={43}
            km={39.7}
            trend="up"
            riders={revealed(PELOTON, frame, 26)}
          />
        </Panel>
      </div>

      <div
        style={{ transform: `translateX(${calloutX}px)`, opacity: calloutOpacity }}
      >
        <Callout
          kicker="Live"
          lines={[
            "Every group.",
            "Every gap.",
            <span key="l" style={{ color: "#ff7a2f" }}>
              To the second.
            </span>,
          ]}
        />
      </div>
    </AbsoluteFill>
  );
};
