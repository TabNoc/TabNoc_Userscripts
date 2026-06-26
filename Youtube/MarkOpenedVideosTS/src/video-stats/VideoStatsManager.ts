import type { BatchResponse, VideoObject, VideoOpenStatus } from "../api/ApiService";
import { createVideoStatsTracker } from "./VideoStatsTrackerFactory";
import { ConsoleWatchSessionLogger, type WatchSessionLogger } from "./WatchSessionLogger";
import type { PlayerSnapshot, TrackerTransitionAction } from "./WatchSessionTypes";

type SaveReason = "session-start" | "session-stop" | "stopped" | "paused" | "checkpoint" | "loop";
type QueuedSaveReason = Exclude<SaveReason, "session-start">;
type SaveSnapshot = {
  tracker: ReturnType<typeof createVideoStatsTracker>;
  state: VideoObject;
  activeWatchSeconds: number;
};

export interface IVideoStatsApi {
  getVideoStatus(id: string): Promise<BatchResponse<VideoOpenStatus>>;
  createOrUpdateVideo(item: VideoObject): Promise<BatchResponse<string | Record<string, unknown>>>;
}

export type BeginSessionInput = {
  videoId: string;
  videoTitle: string;
  videoAuthor: string;
  videoLength: number;
  isShort: boolean;
};

export class VideoStatsManager {
  private tracker: ReturnType<typeof createVideoStatsTracker> | null = null;
  private saveQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly api: IVideoStatsApi,
    private readonly logger: WatchSessionLogger = new ConsoleWatchSessionLogger("VideoStatsManager"),
  ) {}

  hasActiveSession(): boolean {
    return this.tracker != null;
  }

  getActiveWatchSeconds(): number {
    return this.tracker?.getActiveWatchSeconds() ?? 0;
  }

  getCurrentState(): VideoObject | null {
    if (this.tracker == null) {
      return null;
    }
    const state = this.tracker.getMutableVideoObjectRef();
    return JSON.parse(JSON.stringify(state)) as VideoObject;
  }

  async getVideoOpenStatus(videoId: string): Promise<VideoOpenStatus> {
    const response = await this.api.getVideoStatus(videoId);
    if (!response.ok) {
      throw new Error(`Error fetching video status: ${response.error}`);
    }
    return response.body;
  }

  async beginSession(input: BeginSessionInput): Promise<void> {
    if (this.hasActiveSession()) {
      throw new Error("Video stats session is already active.");
    }

    const state: VideoObject = {
      VideoID: input.videoId,
      VideoTitle: input.videoTitle,
      VideoAuthor: input.videoAuthor,
      VideoLength: input.videoLength,
      IsShort: input.isShort,
      Watches: [
        {
          WatchedLength: -99,
          Date: new Date().toString(),
        },
      ],
    };

    this.tracker = createVideoStatsTracker(state);
    const snapshot = this.snapshotCurrentState();
    await this.persistNow("session-start", snapshot);
  }

  handleTick(snapshot: PlayerSnapshot, nowMs: number): void {
    if (this.tracker == null) {
      return;
    }

    const actions = this.tracker.tick(snapshot, nowMs);
    const state = this.tracker.getMutableVideoObjectRef();

    for (const action of actions) {
      if (action.type === "pause-log") {
        this.logger.debug("Current watch session paused", {
          VideoID: state.VideoID,
          Session: action.payload.session,
          WatchedLengthCurrent: action.payload.watchedLengthCurrent,
        });
      }
    }

    const saveActions = actions.filter(
      (action): action is Extract<TrackerTransitionAction, { type: "save" }> => action.type === "save",
    );

    for (const action of saveActions) {
      const snapshot = this.snapshotCurrentState();
      if (snapshot != null) {
        this.enqueueSave(action.reason, snapshot);
      }
    }
  }

  async persistNow(reason: SaveReason, snapshot: SaveSnapshot | null = null): Promise<void> {
    const currentSnapshot = snapshot ?? this.snapshotCurrentState();
    if (currentSnapshot == null) {
      return;
    }

    this.logger.debug("Persisting video stats", {
      reason,
      videoId: currentSnapshot.state.VideoID,
      sessions: currentSnapshot.state.Watches.length,
      watchedSeconds: currentSnapshot.activeWatchSeconds,
    });

    const response = await this.api.createOrUpdateVideo(currentSnapshot.state);
    if (!response.ok) {
      throw new Error(`Error persisting video stats: ${response.error}`);
    }

    currentSnapshot.tracker.onAfterSave(currentSnapshot.activeWatchSeconds);
  }

  async stopSession(): Promise<void> {
    if (!this.hasActiveSession()) {
      return;
    }

    const tracker = this.tracker;
    if (tracker != null) {
      const state = tracker.getMutableVideoObjectRef();
      const currentSession = state.Watches[state.Watches.length - 1] ?? null;
      if (
        currentSession != null &&
        currentSession.WatchedLength < 0 &&
        tracker.hasObservedPlaybackSnapshot()
      ) {
        currentSession.WatchedLength = Math.max(0, Math.round(tracker.getActiveWatchSeconds()));
      }
    }

    const snapshot = this.snapshotCurrentState();
    if (snapshot != null) {
      this.enqueueSave("session-stop", snapshot);
    }
    await this.saveQueue;

    this.tracker = null;
  }

  private enqueueSave(reason: QueuedSaveReason, snapshot: SaveSnapshot): void {
    this.saveQueue = this.saveQueue
      .then(() => this.persistNow(reason, snapshot))
      .catch((error) => {
        this.logger.error("Error in queued video stats save", error);
      });
  }

  private snapshotCurrentState(): SaveSnapshot | null {
    if (this.tracker == null) {
      return null;
    }

    const state = this.tracker.getMutableVideoObjectRef();
    const stateCopy = JSON.parse(JSON.stringify(state)) as VideoObject;

    return {
      tracker: this.tracker,
      state: stateCopy,
      activeWatchSeconds: this.tracker.getActiveWatchSeconds(),
    };
  }
}
