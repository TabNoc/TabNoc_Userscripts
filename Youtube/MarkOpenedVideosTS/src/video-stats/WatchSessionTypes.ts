export type SessionDate = string | null;

export type WatchSession = {
  WatchedLength: number;
  Date: SessionDate;
};

export type VideoStatsState = {
  VideoID: string;
  VideoTitle: string;
  VideoAuthor: string;
  VideoLength: number;
  IsShort: boolean;
  Watches: WatchSession[];
};

export type TrackerState = {
  activeWatchSeconds: number;
  lastTickAtMs: number | null;
  lastPlayerState: number | null;
  lastCurrentTimeSeconds: number | null;
  hasSavedOnStoppedState: boolean;
  lastSavedWatchSeconds: number;
};

export type PlayerSnapshot = {
  playerState: number;
  currentTimeSeconds: number;
  playbackRate: number;
};

export type TrackerTransitionAction =
  | { type: "save"; reason: "stopped" | "checkpoint" | "loop" }
  | { type: "next-session"; reason: "loop" | "resume-after-stop" }
  | { type: "pause-log"; payload: { session: WatchSession | null; watchedLengthCurrent: number } };
