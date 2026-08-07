import type { WatchEntry } from "../api/ApiService";

export type TrackerState = {
  activeWatchSeconds: number;
  observedPlaybackSeconds: number;
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
  | { type: "save"; reason: "stopped" | "paused" | "checkpoint" | "loop" }
  | { type: "next-session"; reason: "loop" | "resume-after-stop" }
  | { type: "pause-log"; payload: { session: WatchEntry | null; watchedLengthCurrent: number } };
