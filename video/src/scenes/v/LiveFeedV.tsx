import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Panel } from "../../ui/Panel";
import { GroupRow } from "../../ui/GroupRow";
import { Callout } from "../../ui/Stage";
import { BREAK, CHASE, PELOTON } from "../../data";

const revealed = <T,>(arr: T[], frame: number, start: number, per = 4) =>
  arr.slice(0, Math.max(0, Math.floor((frame - start) / per) + 1));

export const LiveFeedV: React.FC = () => {
  const frame = useCurrentFrame();

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
          kicker="Live"
          fontSize={92}
          kickerSize={34}
          lines={[
            "Every group.",
            "Every gap.",
            <span key="l" style={{ color: "#ff7a2f" }}>
              To the second.
            </span>,
          ]}
          style={{ maxWidth: 1000 }}
        />
      </div>

      <div style={{ transform: `translateY(${panelY}px)` }}>
        <Panel width={1000}>
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
            riders={revealed(PELOTON, frame, 24)}
          />
        </Panel>
      </div>
    </AbsoluteFill>
  );
};
