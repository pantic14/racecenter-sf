import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Panel } from "../ui/Panel";
import { GroupRow } from "../ui/GroupRow";
import { ScrubBar } from "../ui/ScrubBar";
import { Callout } from "../ui/Stage";
import { C } from "../theme";
import { BREAK, CHASE } from "../data";

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");

export const Replay: React.FC = () => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [8, 120], [0.18, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // stage clock counts up, km-to-go counts down as the scrubber advances
  const secs = interpolate(progress, [0, 1], [15 * 3600 + 12 * 60, 16 * 3600 + 41 * 60]);
  const clockTime = `${pad(secs / 3600)}:${pad((secs % 3600) / 60)}:${pad(secs % 60)}`;
  const km = interpolate(progress, [0, 1], [44.0, 1.2]).toFixed(1);

  const panelX = interpolate(frame, [0, 24], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const calloutOpacity = interpolate(frame, [40, 62], [0, 1], {
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
      <div
        style={{ transform: `translateX(${calloutX(calloutOpacity)}px)`, opacity: calloutOpacity }}
      >
        <Callout
          kicker="Never miss a move"
          accent={C.replayAccent}
          lines={[
            "Replay any stage.",
            <span key="l" style={{ color: "#a05ad0" }}>
              Moment by moment.
            </span>,
          ]}
        />
      </div>

      <div style={{ transform: `translateX(${panelX}px)`, marginLeft: "auto" }}>
        <Panel width={980} replay>
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

const calloutX = (o: number) => interpolate(o, [0, 1], [-50, 0]);
