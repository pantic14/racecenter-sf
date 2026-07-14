import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Stage } from "./ui/Stage";
import { fadeInOut } from "./anim";
import { Intro } from "./scenes/Intro";
import { LiveFeed } from "./scenes/LiveFeed";
import { Climb } from "./scenes/Climb";
import { Replay } from "./scenes/Replay";
import { Outro } from "./scenes/Outro";

const OVERLAP = 12; // frames of cross-fade between scenes

const SCENES: { Comp: React.FC; dur: number }[] = [
  { Comp: Intro, dur: 78 },
  { Comp: LiveFeed, dur: 186 },
  { Comp: Climb, dur: 150 },
  { Comp: Replay, dur: 162 },
  { Comp: Outro, dur: 126 },
];

export const TOTAL =
  SCENES.reduce((s, x) => s + x.dur, 0) - OVERLAP * (SCENES.length - 1);

export const Fade: React.FC<{ dur: number; children: React.ReactNode }> = ({
  dur,
  children,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: fadeInOut(frame, dur) }}>
      {children}
    </AbsoluteFill>
  );
};

export const Promo: React.FC = () => {
  let from = 0;
  return (
    <Stage>
      {SCENES.map(({ Comp, dur }, i) => {
        const el = (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Fade dur={dur}>
              <Comp />
            </Fade>
          </Sequence>
        );
        from += dur - OVERLAP;
        return el;
      })}
    </Stage>
  );
};
