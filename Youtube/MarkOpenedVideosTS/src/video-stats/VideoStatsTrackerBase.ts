import type {
  PlayerSnapshot,
  TrackerState,
  TrackerTransitionAction,
  VideoStatsState,
  WatchSession,
} from "./WatchSessionTypes";
import type { WatchSessionLogger } from "./WatchSessionLogger";

export abstract class VideoStatsTrackerBase {
  protected readonly trackerState: TrackerState = {
    activeWatchSeconds: 0,
    lastTickAtMs: null,
    lastPlayerState: null,
    lastCurrentTimeSeconds: null,
    hasSavedOnStoppedState: false,
    lastSavedWatchSeconds: 0,
  };

  protected constructor(
    protected readonly videoStatsState: VideoStatsState,
    protected readonly logger: WatchSessionLogger,
  ) {}

  tick(snapshot: PlayerSnapshot, nowMs: number): TrackerTransitionAction[] {
    const actions: TrackerTransitionAction[] = [];

    this.logger.debug("Tick", {
      state: snapshot.playerState,
      currentTime: snapshot.currentTimeSeconds,
      playbackRate: snapshot.playbackRate,
      activeWatchSeconds: this.trackerState.activeWatchSeconds,
    });

    if (snapshot.playerState === 2 && this.trackerState.lastPlayerState === 1) {
      actions.push({
        type: "pause-log",
        payload: {
          session: this.getCurrentSession(),
          watchedLengthCurrent: Math.round(this.trackerState.activeWatchSeconds),
        },
      });
    }

    if (this.shouldSplitSessionOnLoop(snapshot)) {
      this.logger.info("Detected loop split");
      this.accumulateSinceLastTick(nowMs, snapshot.playbackRate);
      this.updateCurrentSession(Math.round(this.trackerState.activeWatchSeconds));
      actions.push({ type: "next-session", reason: "loop" });
      actions.push({ type: "save", reason: "loop" });
      this.beginNextWatchSession();
    }

    if (
      snapshot.playerState === 1 &&
      this.trackerState.lastPlayerState === 0 &&
      this.trackerState.hasSavedOnStoppedState
    ) {
      actions.push({ type: "next-session", reason: "resume-after-stop" });
      this.beginNextWatchSession();
    }

    if (snapshot.playerState === 1) {
      if (this.trackerState.lastTickAtMs != null) {
        this.accumulateSinceLastTick(nowMs, snapshot.playbackRate);
      } else {
        this.trackerState.lastTickAtMs = nowMs;
      }
      this.trackerState.hasSavedOnStoppedState = false;
    } else {
      this.accumulateSinceLastTick(nowMs, snapshot.playbackRate);
      this.trackerState.lastTickAtMs = null;
    }

    if (
      snapshot.playerState === 0 &&
      this.trackerState.lastPlayerState !== 0 &&
      !this.trackerState.hasSavedOnStoppedState
    ) {
      this.logger.info("Detected stopped transition save");
      this.updateCurrentSession(Math.round(this.trackerState.activeWatchSeconds));
      actions.push({ type: "save", reason: "stopped" });
      this.trackerState.hasSavedOnStoppedState = true;
      this.trackerState.lastSavedWatchSeconds = this.trackerState.activeWatchSeconds;
    }

    if (this.trackerState.lastSavedWatchSeconds + 14 < this.trackerState.activeWatchSeconds) {
      this.updateCurrentSession(Math.round(this.trackerState.activeWatchSeconds));
      actions.push({ type: "save", reason: "checkpoint" });
      this.trackerState.lastSavedWatchSeconds = this.trackerState.activeWatchSeconds;
    }

    this.trackerState.lastPlayerState = snapshot.playerState;
    this.trackerState.lastCurrentTimeSeconds = snapshot.currentTimeSeconds;

    return actions;
  }

  getVideoStatsState(): VideoStatsState {
    return this.videoStatsState;
  }

  getActiveWatchSeconds(): number {
    return this.trackerState.activeWatchSeconds;
  }

  replaceVideoStatsState(nextState: VideoStatsState): void {
    this.videoStatsState.VideoID = nextState.VideoID;
    this.videoStatsState.VideoTitle = nextState.VideoTitle;
    this.videoStatsState.VideoAuthor = nextState.VideoAuthor;
    this.videoStatsState.VideoLength = nextState.VideoLength;
    this.videoStatsState.IsShort = nextState.IsShort;
    this.videoStatsState.Watches = [...nextState.Watches];
  }

  setActiveWatchSeconds(value: number): void {
    this.trackerState.activeWatchSeconds = value;
  }

  onAfterSave(): void {
    this.trackerState.lastSavedWatchSeconds = this.trackerState.activeWatchSeconds;
  }

  protected beginNextWatchSession(): void {
    const current = this.getCurrentSession();
    if (current == null || current.WatchedLength >= 0) {
      this.videoStatsState.Watches.push({
        WatchedLength: -99,
        Date: new Date().toString(),
      });
    }
    this.trackerState.activeWatchSeconds = 0;
    this.trackerState.lastTickAtMs = null;
    this.trackerState.lastSavedWatchSeconds = 0;
    this.trackerState.hasSavedOnStoppedState = false;
  }

  protected updateCurrentSession(watchedLength: number): void {
    const current = this.getCurrentSession();
    if (current != null) {
      current.WatchedLength = watchedLength;
    }
  }

  protected getCurrentSession(): WatchSession | null {
    const watches = this.videoStatsState.Watches;
    if (!Array.isArray(watches) || watches.length === 0) {
      return null;
    }
    return watches[watches.length - 1] ?? null;
  }

  protected accumulateSinceLastTick(nowMs: number, playbackRate: number): void {
    if (this.trackerState.lastTickAtMs == null) {
      return;
    }
    const deltaSeconds = Math.max(0, (nowMs - this.trackerState.lastTickAtMs) / 1000);
    const rate = Math.max(0.1, playbackRate || 1);
    this.trackerState.activeWatchSeconds += deltaSeconds * rate;
    this.trackerState.lastTickAtMs = nowMs;
  }

  protected abstract shouldSplitSessionOnLoop(snapshot: PlayerSnapshot): boolean;
}
