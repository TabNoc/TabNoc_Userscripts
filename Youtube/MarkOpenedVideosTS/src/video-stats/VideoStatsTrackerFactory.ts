import { ConsoleWatchSessionLogger } from "./WatchSessionLogger";
import type { VideoStatsState } from "./WatchSessionTypes";
import { ShortVideoStatsTracker } from "./ShortVideoStatsTracker";
import { RegularVideoStatsTracker } from "./RegularVideoStatsTracker";

export function createVideoStatsTracker(videoStatsState: VideoStatsState) {
  const logger = new ConsoleWatchSessionLogger(
    videoStatsState.IsShort ? "ShortVideoTracker" : "RegularVideoTracker",
  );

  if (videoStatsState.IsShort) {
    return new ShortVideoStatsTracker(videoStatsState, logger);
  }

  return new RegularVideoStatsTracker(videoStatsState, logger);
}
