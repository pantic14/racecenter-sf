import React from "react";
import { Composition } from "remotion";
import { Promo, TOTAL } from "./Promo";
import { PromoVertical, TOTAL_V } from "./PromoVertical";
import { PromoShortHook, TOTAL_SH } from "./PromoShortHook";
import { Commentators, TOTAL_C } from "./Commentators";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Promo"
        component={Promo}
        durationInFrames={TOTAL}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PromoVertical"
        component={PromoVertical}
        durationInFrames={TOTAL_V}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="PromoShortHook"
        component={PromoShortHook}
        durationInFrames={TOTAL_SH}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CommentatorsES"
        component={Commentators}
        durationInFrames={TOTAL_C}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ lang: "es" as const }}
      />
      <Composition
        id="CommentatorsEN"
        component={Commentators}
        durationInFrames={TOTAL_C}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ lang: "en" as const }}
      />
    </>
  );
};
