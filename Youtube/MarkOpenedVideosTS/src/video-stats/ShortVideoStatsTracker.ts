import { VideoStatsTrackerBase } from "./VideoStatsTrackerBase";
import type { PlayerSnapshot, VideoStatsState } from "./WatchSessionTypes";
import type { WatchSessionLogger } from "./WatchSessionLogger";

export class ShortVideoStatsTracker extends VideoStatsTrackerBase {
  constructor(videoStatsState: VideoStatsState, logger: WatchSessionLogger) {
    super(videoStatsState, logger);
  }

  protected shouldSplitSessionOnLoop(snapshot: PlayerSnapshot): boolean {
    return (
      snapshot.playerState === 1 &&
      this.trackerState.lastPlayerState === 1 &&
      this.trackerState.lastCurrentTimeSeconds != null &&
      snapshot.currentTimeSeconds + 0.25 < this.trackerState.lastCurrentTimeSeconds &&
      this.trackerState.activeWatchSeconds > 0
    );
  }
}
