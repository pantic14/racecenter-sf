import React from "react";
import { Sequence } from "remotion";
import { Stage } from "./ui/Stage";
import { Fade } from "./Promo";
import { Intro } from "./scenes/Intro";
import { LiveFeedV } from "./scenes/v/LiveFeedV";
import { ClimbV } from "./scenes/v/ClimbV";
import { ReplayV } from "./scenes/v/ReplayV";
import { OutroV } from "./scenes/v/OutroV";

const OVERLAP = 12;

const SCENES: { Comp: React.FC; dur: number }[] = [
  { Comp: Intro, dur: 78 },
  { Comp: LiveFeedV, dur: 186 },
  { Comp: ClimbV, dur: 150 },
  { Comp: ReplayV, dur: 162 },
  { Comp: OutroV, dur: 156 },
];

export const TOTAL_V =
  SCENES.reduce((s, x) => s + x.dur, 0) - OVERLAP * (SCENES.length - 1);

export const PromoVertical: React.FC = () => {
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
