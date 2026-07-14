import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Panel } from "../../ui/Panel";
import { GroupRow } from "../../ui/GroupRow";
import { Callout } from "../../ui/Stage";
import { BREAK } from "../../data";

export const ClimbV: React.FC = () => {
  const frame = useCurrentFrame();

  const vam =
    Math.round(
      interpolate(frame, [10, 90], [1180, 1760], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }) / 10,
    ) * 10;
  const grad = interpolate(frame, [10, 90], [6.2, 11.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const v500 = Math.round(vam * 0.98);
  const v1k = Math.round(vam * 0.95);
  const v5k = Math.round(vam * 0.9);

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
        gap: 80,
        padding: "0 40px",
      }}
    >
      <div style={{ transform: `translateY(${calloutY}px)`, textAlign: "center" }}>
        <Callout
          kicker="On every climb"
          fontSize={92}
          kickerSize={34}
          lines={[
            "VAM, gradient",
            <span key="l">
              & <span style={{ color: "#ff7a2f" }}>wind</span>, live
            </span>,
          ]}
          style={{ maxWidth: 1000 }}
        />
      </div>

      <div style={{ transform: `translateY(${panelY}px)` }}>
        <Panel width={1010}>
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
    </AbsoluteFill>
  );
};
