import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Panel } from "../ui/Panel";
import { GroupRow } from "../ui/GroupRow";
import { Callout } from "../ui/Stage";
import { BREAK } from "../data";

export const Climb: React.FC = () => {
  const frame = useCurrentFrame();

  // metrics climb as the riders hit the steep ramp
  const vam = Math.round(interpolate(frame, [10, 90], [1180, 1760], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }) / 10) * 10;
  const grad = interpolate(frame, [10, 90], [6.2, 11.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const v500 = Math.round(vam * 0.98);
  const v1k = Math.round(vam * 0.95);
  const v5k = Math.round(vam * 0.9);

  const panelY = interpolate(frame, [0, 24], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const calloutOpacity = interpolate(frame, [36, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 54,
      }}
    >
      <div
        style={{ transform: `translateY(${panelY}px) scale(1.08)` }}
      >
        <Panel width={1020}>
          <GroupRow
            label="Head of race"
            size={2}
            gapToLeader={0}
            kph={22}
            km={6.1}
            gradient={grad}
            windLabel="headwind"
            windKph={18}
            windDeg={0}
            temp={14}
            vam={{ inst: vam, v500, v1k, v5k }}
            riders={BREAK.slice(0, 2)}
          />
        </Panel>
      </div>

      <div style={{ opacity: calloutOpacity, textAlign: "center" }}>
        <Callout
          kicker="On every climb"
          lines={[
            <span key="l">
              VAM, gradient &{" "}
              <span style={{ color: "#ff7a2f" }}>wind</span>, live
            </span>,
          ]}
          style={{ maxWidth: 1000 }}
        />
      </div>
    </AbsoluteFill>
  );
};
