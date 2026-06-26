import { ConsoleWatchSessionLogger } from "./WatchSessionLogger";
import type { VideoObject } from "../api/ApiService";
import { ShortVideoStatsTracker } from "./ShortVideoStatsTracker";
import { RegularVideoStatsTracker } from "./RegularVideoStatsTracker";

export function createVideoStatsTracker(videoObject: VideoObject) {
  if (videoObject.IsShort) {
    return new ShortVideoStatsTracker(videoObject, new ConsoleWatchSessionLogger("ShortVideoTracker"));
  }

  return new RegularVideoStatsTracker(videoObject, new ConsoleWatchSessionLogger("RegularVideoTracker"));
}
