import { VideoStatsTrackerBase } from "./VideoStatsTrackerBase";
import type { PlayerSnapshot, VideoStatsState } from "./WatchSessionTypes";
import type { WatchSessionLogger } from "./WatchSessionLogger";

export class RegularVideoStatsTracker extends VideoStatsTrackerBase {
  constructor(videoStatsState: VideoStatsState, logger: WatchSessionLogger) {
    super(videoStatsState, logger);
  }

  protected shouldSplitSessionOnLoop(_snapshot: PlayerSnapshot): boolean {
    return false;
  }
}
