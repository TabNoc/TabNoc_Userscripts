import { VideoStatsTrackerBase } from "./VideoStatsTrackerBase";
import type { PlayerSnapshot } from "./WatchSessionTypes";
import type { VideoObject } from "../api/ApiService";
import type { WatchSessionLogger } from "./WatchSessionLogger";

export class RegularVideoStatsTracker extends VideoStatsTrackerBase {
  constructor(videoObject: VideoObject, logger: WatchSessionLogger) {
    super(videoObject, logger);
  }

  protected shouldSplitSessionOnLoop(_snapshot: PlayerSnapshot): boolean {
    return false;
  }
}
