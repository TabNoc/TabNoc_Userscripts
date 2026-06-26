import { VideoStatsTrackerBase } from "./VideoStatsTrackerBase";
import type { PlayerSnapshot } from "./WatchSessionTypes";
import type { VideoObject } from "../api/ApiService";
import type { WatchSessionLogger } from "./WatchSessionLogger";

export class ShortVideoStatsTracker extends VideoStatsTrackerBase {
  constructor(videoObject: VideoObject, logger: WatchSessionLogger) {
    super(videoObject, logger);
  }

  protected shouldSplitSessionOnLoop(snapshot: PlayerSnapshot): boolean {
    if (this.trackerState.lastCurrentTimeSeconds == null) {
      return false;
    }

    const currentIsLoopRelevant = snapshot.playerState === 1 || snapshot.playerState === 3;
    const lastIsLoopRelevant = this.trackerState.lastPlayerState === 1 || this.trackerState.lastPlayerState === 3;
    const backwardsJumpSeconds = this.trackerState.lastCurrentTimeSeconds - snapshot.currentTimeSeconds;
    const nearStartThresholdSeconds = 3;
    const isNearStartAfterJump = snapshot.currentTimeSeconds <= nearStartThresholdSeconds;

    return (
      currentIsLoopRelevant &&
      lastIsLoopRelevant &&
      backwardsJumpSeconds > 0.25 &&
      isNearStartAfterJump &&
      this.trackerState.activeWatchSeconds > 0
    );
  }
}
