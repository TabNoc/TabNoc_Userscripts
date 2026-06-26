import { describe, expect, it } from "vitest";
import { ShortVideoStatsTracker } from "./ShortVideoStatsTracker";
import { RegularVideoStatsTracker } from "./RegularVideoStatsTracker";
import type { VideoStatsState } from "./WatchSessionTypes";
import type { WatchSessionLogger } from "./WatchSessionLogger";

class NoopLogger implements WatchSessionLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

function createState(isShort: boolean): VideoStatsState {
  return {
    VideoID: "video-id",
    VideoTitle: "title",
    VideoAuthor: "author",
    VideoLength: 60,
    IsShort: isShort,
    Watches: [{ WatchedLength: -99, Date: "2026-01-01T00:00:00.000Z" }],
  };
}

type TrackerKind = "regular" | "short";

function createTracker(kind: TrackerKind) {
  return kind === "short"
    ? new ShortVideoStatsTracker(createState(true), new NoopLogger())
    : new RegularVideoStatsTracker(createState(false), new NoopLogger());
}

describe("VideoStatsTracker", () => {
  it("tracks elapsed watchtime across play pause resume", () => {
    const tracker = new RegularVideoStatsTracker(createState(false), new NoopLogger());

    tracker.tick({ playerState: 1, currentTimeSeconds: 0, playbackRate: 1 }, 0);
    tracker.tick({ playerState: 1, currentTimeSeconds: 5, playbackRate: 1 }, 5000);
    tracker.tick({ playerState: 2, currentTimeSeconds: 5, playbackRate: 1 }, 6000);
    tracker.tick({ playerState: 1, currentTimeSeconds: 5, playbackRate: 1 }, 7000);
    tracker.tick({ playerState: 1, currentTimeSeconds: 9, playbackRate: 1 }, 11000);

    expect(Math.round(tracker.getActiveWatchSeconds())).toBe(10);
  });

  it("accounts for playback-rate changes over time", () => {
    const tracker = new RegularVideoStatsTracker(createState(false), new NoopLogger());

    tracker.tick({ playerState: 1, currentTimeSeconds: 0, playbackRate: 1.25 }, 0);
    tracker.tick({ playerState: 1, currentTimeSeconds: 240, playbackRate: 1.25 }, 240_000);
    tracker.tick({ playerState: 1, currentTimeSeconds: 300, playbackRate: 2 }, 300_000);

    expect(Math.round(tracker.getActiveWatchSeconds())).toBe(420);
  });

  it("splits short sessions on loop and starts a new watch session", () => {
    const tracker = new ShortVideoStatsTracker(createState(true), new NoopLogger());

    tracker.tick({ playerState: 1, currentTimeSeconds: 0, playbackRate: 1 }, 0);
    tracker.tick({ playerState: 1, currentTimeSeconds: 4.5, playbackRate: 1 }, 4500);
    const actions = tracker.tick({ playerState: 1, currentTimeSeconds: 0.2, playbackRate: 1 }, 5000);

    expect(actions.some((a) => a.type === "next-session" && a.reason === "loop")).toBe(true);
    expect(actions.some((a) => a.type === "save" && a.reason === "loop")).toBe(true);
    expect(tracker.getVideoStatsState().Watches.length).toBe(2);
    expect(tracker.getVideoStatsState().Watches[0].WatchedLength).toBeGreaterThanOrEqual(4);
    expect(Math.round(tracker.getActiveWatchSeconds())).toBe(0);
  });

  it("continues tracking after short loop, pause and resume", () => {
    const tracker = new ShortVideoStatsTracker(createState(true), new NoopLogger());

    tracker.tick({ playerState: 1, currentTimeSeconds: 0, playbackRate: 1 }, 0);
    tracker.tick({ playerState: 1, currentTimeSeconds: 3.5, playbackRate: 1 }, 3500);

    const loopActions = tracker.tick({ playerState: 1, currentTimeSeconds: 0.1, playbackRate: 1 }, 4000);
    expect(loopActions.some((a) => a.type === "next-session" && a.reason === "loop")).toBe(true);

    tracker.tick({ playerState: 2, currentTimeSeconds: 0.6, playbackRate: 1 }, 4500);
    tracker.tick({ playerState: 1, currentTimeSeconds: 0.6, playbackRate: 1 }, 5500);
    tracker.tick({ playerState: 1, currentTimeSeconds: 2.6, playbackRate: 1 }, 7500);

    expect(tracker.getVideoStatsState().Watches.length).toBe(2);
    expect(Math.round(tracker.getActiveWatchSeconds())).toBe(3);
    expect(tracker.getVideoStatsState().Watches[1].WatchedLength).toBe(-99);
  });

  it("emits stopped save only once until resume", () => {
    const tracker = new RegularVideoStatsTracker(createState(false), new NoopLogger());

    tracker.tick({ playerState: 1, currentTimeSeconds: 0, playbackRate: 1 }, 0);
    tracker.tick({ playerState: 1, currentTimeSeconds: 4, playbackRate: 1 }, 4000);

    const firstStop = tracker.tick({ playerState: 0, currentTimeSeconds: 4, playbackRate: 1 }, 5000);
    const secondStop = tracker.tick({ playerState: 0, currentTimeSeconds: 4, playbackRate: 1 }, 6000);

    expect(firstStop.some((a) => a.type === "save" && a.reason === "stopped")).toBe(true);
    expect(secondStop.some((a) => a.type === "save" && a.reason === "stopped")).toBe(false);
  });

  it("creates a new session when resuming after stop", () => {
    const tracker = new RegularVideoStatsTracker(createState(false), new NoopLogger());

    tracker.tick({ playerState: 1, currentTimeSeconds: 0, playbackRate: 1 }, 0);
    tracker.tick({ playerState: 1, currentTimeSeconds: 4, playbackRate: 1 }, 4000);
    tracker.tick({ playerState: 0, currentTimeSeconds: 4, playbackRate: 1 }, 5000);

    const resumeActions = tracker.tick({ playerState: 1, currentTimeSeconds: 4, playbackRate: 1 }, 6000);

    expect(resumeActions.some((a) => a.type === "next-session" && a.reason === "resume-after-stop")).toBe(true);
    expect(tracker.getVideoStatsState().Watches.length).toBe(2);
    expect(Math.round(tracker.getActiveWatchSeconds())).toBe(0);
  });

  it("does not split regular videos on seek backwards", () => {
    const tracker = new RegularVideoStatsTracker(createState(false), new NoopLogger());

    tracker.tick({ playerState: 1, currentTimeSeconds: 10, playbackRate: 1 }, 0);
    const actions = tracker.tick({ playerState: 1, currentTimeSeconds: 1, playbackRate: 1 }, 1000);

    expect(actions.some((a) => a.type === "next-session")).toBe(false);
    expect(tracker.getVideoStatsState().Watches.length).toBe(1);
  });

  describe("transition matrix", () => {
    it.each([
      {
        name: "regular: playing->paused emits pause-log only",
        kind: "regular" as TrackerKind,
        first: { playerState: 1, currentTimeSeconds: 1, playbackRate: 1 },
        second: { playerState: 2, currentTimeSeconds: 1.2, playbackRate: 1 },
        expected: { pauseLog: true, nextSession: false, saveStopped: false, saveLoop: false },
      },
      {
        name: "regular: playing->stopped emits stopped save",
        kind: "regular" as TrackerKind,
        first: { playerState: 1, currentTimeSeconds: 3, playbackRate: 1 },
        second: { playerState: 0, currentTimeSeconds: 3.1, playbackRate: 1 },
        expected: { pauseLog: false, nextSession: false, saveStopped: true, saveLoop: false },
      },
      {
        name: "regular: stopped->playing emits resume next-session",
        kind: "regular" as TrackerKind,
        before: [
          { playerState: 1, currentTimeSeconds: 0, playbackRate: 1, atMs: 0 },
          { playerState: 1, currentTimeSeconds: 2, playbackRate: 1, atMs: 2000 },
          { playerState: 0, currentTimeSeconds: 2, playbackRate: 1, atMs: 3000 },
        ],
        first: { playerState: 0, currentTimeSeconds: 2, playbackRate: 1 },
        second: { playerState: 1, currentTimeSeconds: 2, playbackRate: 1 },
        expected: { pauseLog: false, nextSession: true, saveStopped: false, saveLoop: false },
      },
      {
        name: "short: playing backward seek emits loop split + loop save",
        kind: "short" as TrackerKind,
        before: [
          { playerState: 1, currentTimeSeconds: 0, playbackRate: 1, atMs: 0 },
          { playerState: 1, currentTimeSeconds: 4, playbackRate: 1, atMs: 4000 },
        ],
        first: { playerState: 1, currentTimeSeconds: 4, playbackRate: 1 },
        second: { playerState: 1, currentTimeSeconds: 0.1, playbackRate: 1 },
        expected: { pauseLog: false, nextSession: true, saveStopped: false, saveLoop: true },
      },
      {
        name: "regular: playing backward seek does not split",
        kind: "regular" as TrackerKind,
        before: [
          { playerState: 1, currentTimeSeconds: 0, playbackRate: 1, atMs: 0 },
          { playerState: 1, currentTimeSeconds: 4, playbackRate: 1, atMs: 4000 },
        ],
        first: { playerState: 1, currentTimeSeconds: 4, playbackRate: 1 },
        second: { playerState: 1, currentTimeSeconds: 0.1, playbackRate: 1 },
        expected: { pauseLog: false, nextSession: false, saveStopped: false, saveLoop: false },
      },
    ])("$name", ({ kind, before, first, second, expected }) => {
      const tracker = createTracker(kind);
      let timeMs = 0;

      if (before != null) {
        for (const step of before) {
          tracker.tick(
            {
              playerState: step.playerState,
              currentTimeSeconds: step.currentTimeSeconds,
              playbackRate: step.playbackRate,
            },
            step.atMs,
          );
          timeMs = step.atMs;
        }
      } else {
        tracker.tick(first, 0);
        timeMs = 1000;
      }

      const actions = tracker.tick(second, timeMs + 1000);

      expect(actions.some((a) => a.type === "pause-log")).toBe(expected.pauseLog);
      expect(actions.some((a) => a.type === "next-session")).toBe(expected.nextSession);
      expect(actions.some((a) => a.type === "save" && a.reason === "stopped")).toBe(expected.saveStopped);
      expect(actions.some((a) => a.type === "save" && a.reason === "loop")).toBe(expected.saveLoop);
    });
  });
});
