import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Panel } from "../../ui/Panel";
import { GroupRow } from "../../ui/GroupRow";
import { C } from "../../theme";
import { useCopy } from "../../copy";
import { BREAK, CHASE, PELOTON } from "../../data";

// Opening beat: the race is happening (blurred panel behind) but a commentator
// can't parse it at a glance — "today, you guess".
export const ProblemC: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useCopy();

  const bgOpacity = interpolate(frame, [0, 30], [0, 0.16], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const l0 = interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const l1 = interpolate(frame, [26, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const l2 = interpolate(frame, [50, 74], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const line = { fontWeight: 800, fontSize: 78, lineHeight: 1.1, letterSpacing: "-0.02em" };

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* blurred, dimmed live panel behind the text */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          filter: "blur(9px)",
          opacity: bgOpacity,
          transform: "scale(1.25)",
        }}
      >
        <Panel width={1100}>
          <GroupRow label="Head of race" size={4} gapToLeader={0} kph={46} km={38.4} riders={BREAK} />
          <GroupRow label="Chasers" size={6} gapToLeader={42} kph={45} km={38.9} trend="down" riders={CHASE} />
          <GroupRow label="Peloton" size={132} gapToLeader={214} kph={43} km={39.7} trend="up" riders={PELOTON.slice(0, 6)} />
        </Panel>
      </AbsoluteFill>

      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div
          style={{
            color: C.liveAccent,
            fontWeight: 800,
            letterSpacing: "0.18em",
            fontSize: 26,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          {t.problem.kicker}
        </div>
        <div style={{ ...line, color: "#fff", opacity: l0 }}>{t.problem.lines[0]}</div>
        <div style={{ ...line, color: "#fff", opacity: l1 }}>{t.problem.lines[1]}</div>
        <div style={{ ...line, color: "rgba(255,255,255,0.45)", opacity: l2, marginTop: 6 }}>
          {t.problem.lines[2]}
        </div>
      </div>
    </AbsoluteFill>
  );
};
