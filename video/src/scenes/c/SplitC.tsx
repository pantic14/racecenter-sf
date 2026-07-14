import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Panel } from "../../ui/Panel";
import { GroupRow } from "../../ui/GroupRow";
import { Callout } from "../../ui/Stage";
import { useCopy } from "../../copy";
import { BREAK, CHASE, PELOTON } from "../../data";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// "No surprises": the field splits on the main screen in real time — a chase
// group detaches, gaps open, trend arrows light up. No alert toasts.
export const SplitC: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useCopy();

  const SPLIT = 66; // frame where the chase group breaks away
  const split = frame >= SPLIT;

  const chGap = Math.round(interpolate(frame, [SPLIT, 200], [3, 40], clamp));
  const pelGap = Math.round(interpolate(frame, [40, 220], [5, 226], clamp));
  const chEnter = interpolate(frame, [SPLIT, SPLIT + 26], [0, 1], clamp);

  const panelX = interpolate(frame, [0, 24], [60, 0], clamp);
  const calloutX = interpolate(frame, [40, 64], [-50, 0], clamp);
  const calloutOpacity = interpolate(frame, [40, 64], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 90px", gap: 60 }}>
      <div style={{ transform: `translateX(${calloutX}px)`, opacity: calloutOpacity }}>
        <Callout
          kicker={t.split.kicker}
          lines={[
            t.split.lines[0],
            <span key="l" style={{ color: "#ff7a2f" }}>
              {t.split.lines[1]}
            </span>,
          ]}
        />
      </div>

      <div style={{ transform: `translateX(${panelX}px)`, marginLeft: "auto" }}>
        <Panel width={980}>
          <GroupRow label="Head of race" size={4} gapToLeader={0} kph={46} km={38.4} riders={BREAK} />

          {split && (
            <div style={{ opacity: chEnter, transform: `translateX(${(chEnter - 1) * 40}px)` }}>
              <GroupRow
                label="Chasers"
                size={6}
                gapToLeader={chGap}
                kph={45}
                km={38.9}
                trend="up"
                riders={CHASE}
              />
            </div>
          )}

          <GroupRow
            label="Peloton"
            size={132}
            gapToLeader={pelGap}
            kph={43}
            km={39.7}
            trend={split ? "up" : undefined}
            riders={PELOTON.slice(0, 6)}
          />
        </Panel>
      </div>
    </AbsoluteFill>
  );
};
