import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Panel } from "../../ui/Panel";
import { GroupRow } from "../../ui/GroupRow";
import { Callout } from "../../ui/Stage";
import { useCopy } from "../../copy";
import { BREAK } from "../../data";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// "Details you can't eyeball": VAM / gradient / wind / temp climbing on a ramp.
export const DetailsC: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useCopy();

  const vam = Math.round(interpolate(frame, [10, 110], [1180, 1760], clamp) / 10) * 10;
  const grad = interpolate(frame, [10, 110], [6.2, 11.4], clamp);
  const v500 = Math.round(vam * 0.98);
  const v1k = Math.round(vam * 0.95);
  const v5k = Math.round(vam * 0.9);

  const panelY = interpolate(frame, [0, 24], [40, 0], clamp);
  const calloutOpacity = interpolate(frame, [40, 64], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 54 }}>
      <div style={{ transform: `translateY(${panelY}px) scale(1.06)` }}>
        <Panel width={1120}>
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
          kicker={t.details.kicker}
          lines={[
            t.details.lines[0],
            <span key="l" style={{ color: "#ff7a2f" }}>
              {t.details.lines[1]}
            </span>,
          ]}
          style={{ maxWidth: 1200 }}
        />
      </div>
    </AbsoluteFill>
  );
};
