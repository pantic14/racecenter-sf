import { interpolate } from "remotion";

/** Fade content in over the first `io` frames and out over the last `io`. */
export const fadeInOut = (frame: number, dur: number, io = 12) =>
  interpolate(frame, [0, io, dur - io, dur], [0, 1, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }) *
  interpolate(frame, [dur - io, dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Ease a value in over [0, dur] with clamping. */
export const easeIn = (frame: number, dur: number) =>
  interpolate(frame, [0, dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
