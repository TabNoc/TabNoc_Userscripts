import type {
  PlayerSnapshot,
  TrackerState,
  TrackerTransitionAction,
} from "./WatchSessionTypes";
import type { VideoObject, WatchEntry } from "../api/ApiService";
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
    protected readonly videoObject: VideoObject,
    protected readonly logger: WatchSessionLogger,
  ) {}

  tick(snapshot: PlayerSnapshot, nowMs: number): TrackerTransitionAction[] {
    const actions: TrackerTransitionAction[] = [];
    const isPauseTransition = snapshot.playerState === 2 && this.trackerState.lastPlayerState === 1;

    this.logger.debug("Tick", {
      state: snapshot.playerState,
      currentTime: snapshot.currentTimeSeconds,
      playbackRate: snapshot.playbackRate,
      activeWatchSeconds: this.trackerState.activeWatchSeconds,
    });

    if (isPauseTransition) {
      this.accumulateSinceLastTick(nowMs, snapshot.playbackRate);
      this.updateCurrentSession(Math.round(this.trackerState.activeWatchSeconds));
      actions.push({ type: "save", reason: "paused" });
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
      if (!isPauseTransition) {
        this.accumulateSinceLastTick(nowMs, snapshot.playbackRate);
      }
      this.trackerState.lastTickAtMs = null;

      if (this.trackerState.activeWatchSeconds === 0) {
        const current = this.getCurrentSession();
        if (current != null && current.WatchedLength < 0) {
          current.WatchedLength = 0;
        }
      }
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

  getMutableVideoObjectRef(): VideoObject {
    return this.videoObject;
  }

  getActiveWatchSeconds(): number {
    return this.trackerState.activeWatchSeconds;
  }

  hasObservedPlaybackSnapshot(): boolean {
    return this.trackerState.lastPlayerState != null;
  }

  replaceVideoObject(nextState: VideoObject): void {
    this.videoObject.VideoID = nextState.VideoID;
    this.videoObject.VideoTitle = nextState.VideoTitle;
    this.videoObject.VideoAuthor = nextState.VideoAuthor;
    this.videoObject.VideoLength = nextState.VideoLength;
    this.videoObject.IsShort = nextState.IsShort;
    this.videoObject.Watches = [...nextState.Watches];
  }

  setActiveWatchSeconds(value: number): void {
    this.trackerState.activeWatchSeconds = value;
  }

  onAfterSave(savedWatchSeconds: number): void {
    this.trackerState.lastSavedWatchSeconds = Math.max(
      this.trackerState.lastSavedWatchSeconds,
      savedWatchSeconds,
    );
  }

  protected beginNextWatchSession(): void {
    const current = this.getCurrentSession();
    if (current == null || current.WatchedLength >= 0) {
      this.videoObject.Watches.push({
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

  protected getCurrentSession(): WatchEntry | null {
    const watches = this.videoObject.Watches;
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
