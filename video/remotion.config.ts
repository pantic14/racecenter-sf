import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// High-quality H.264 for the promo. Lower CRF = better quality / bigger file.
Config.setCodec("h264");
Config.setCrf(18);
