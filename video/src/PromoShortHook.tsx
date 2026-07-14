import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Stage } from "./ui/Stage";
import { Fade } from "./Promo";
import { LiveFeedV } from "./scenes/v/LiveFeedV";
import { ClimbV } from "./scenes/v/ClimbV";
import { ReplayV } from "./scenes/v/ReplayV";
import { OutroV } from "./scenes/v/OutroV";

const OVERLAP = 12;

// Hook-first order: open straight on the live action (no title card), brand at the end.
const SCENES: { Comp: React.FC; dur: number }[] = [
  { Comp: LiveFeedV, dur: 180 },
  { Comp: ClimbV, dur: 150 },
  { Comp: ReplayV, dur: 162 },
  { Comp: OutroV, dur: 156 },
];

export const TOTAL_SH =
  SCENES.reduce((s, x) => s + x.dur, 0) - OVERLAP * (SCENES.length - 1);

// Music bed volume: quick fade-in, fade-out over the last ~0.8s.
const MusicBed: React.FC = () => {
  const frame = useCurrentFrame();
  const volume = interpolate(
    frame,
    [0, 8, TOTAL_SH - 24, TOTAL_SH],
    [0, 0.7, 0.7, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <Audio src={staticFile("music.wav")} volume={volume} />;
};

export const PromoShortHook: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill>
      <MusicBed />
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
    </AbsoluteFill>
  );
};
