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
import { LangContext, type Lang } from "./copy";
import { ProblemC } from "./scenes/c/ProblemC";
import { SolutionC } from "./scenes/c/SolutionC";
import { GroupsC } from "./scenes/c/GroupsC";
import { SplitC } from "./scenes/c/SplitC";
import { PositionC } from "./scenes/c/PositionC";
import { DetailsC } from "./scenes/c/DetailsC";
import { CloseC } from "./scenes/c/CloseC";

const OVERLAP = 12;

const SCENES: { Comp: React.FC; dur: number }[] = [
  { Comp: ProblemC, dur: 150 },
  { Comp: SolutionC, dur: 120 },
  { Comp: GroupsC, dur: 270 },
  { Comp: SplitC, dur: 270 },
  { Comp: PositionC, dur: 240 },
  { Comp: DetailsC, dur: 270 },
  { Comp: CloseC, dur: 210 },
];

export const TOTAL_C =
  SCENES.reduce((s, x) => s + x.dur, 0) - OVERLAP * (SCENES.length - 1);

// Soft music bed at low volume so the on-screen text carries the message.
const MusicBed: React.FC = () => {
  const frame = useCurrentFrame();
  const volume = interpolate(
    frame,
    [0, 12, TOTAL_C - 40, TOTAL_C],
    [0, 0.35, 0.35, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <Audio src={staticFile("music-soft.wav")} volume={volume} />;
};

export const Commentators: React.FC<{ lang: Lang }> = ({ lang }) => {
  let from = 0;
  return (
    <LangContext.Provider value={lang}>
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
    </LangContext.Provider>
  );
};
