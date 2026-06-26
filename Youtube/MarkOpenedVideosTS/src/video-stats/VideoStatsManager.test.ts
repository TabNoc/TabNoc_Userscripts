import { describe, expect, it } from "vitest";
import type { BatchResponse, VideoObject, VideoOpenStatus } from "../api/ApiService";
import type { WatchSessionLogger } from "./WatchSessionLogger";
import { IVideoStatsApi, VideoStatsManager } from "./VideoStatsManager";

class SilentLogger implements WatchSessionLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

class SilentConsole {
  static async run<T>(fn: () => Promise<T> | T): Promise<T> {
    const originalDebug = console.debug;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    try {
      console.debug = () => {};
      console.info = () => {};
      console.warn = () => {};
      console.error = () => {};
      return await fn();
    } finally {
      console.debug = originalDebug;
      console.info = originalInfo;
      console.warn = originalWarn;
      console.error = originalError;
    }
  }
}

class FakeApi implements IVideoStatsApi {
  constructor(
    private readonly status: VideoOpenStatus = { Exists: false, HasHighWatchtime: false, AdjustedWatchRatio: 0 },
  ) {}

  public latest: VideoObject | null = null;
  public persistedCount = 0;

  async getVideoStatus(_id: string): Promise<BatchResponse<VideoOpenStatus>> {
    return { ok: true, status: 200, body: this.status };
  }

  async getVideo(id: string): Promise<BatchResponse<VideoObject>> {
    const hit = this.latest;
    if (hit == null) {
      return { ok: false, status: 404, error: "not found" };
    }
    if (hit.VideoID !== id) {
      return { ok: false, status: 404, error: "not found" };
    }
    return { ok: true, status: 200, body: JSON.parse(JSON.stringify(hit)) as VideoObject };
  }

  async createOrUpdateVideo(item: VideoObject): Promise<BatchResponse<string | Record<string, unknown>>> {
    this.persistedCount++;
    this.latest = JSON.parse(JSON.stringify(item)) as VideoObject;
    return { ok: true, status: 204, body: "" };
  }
}

function createDeferred() {
  let resolve: (() => void) | null = null;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return {
    promise,
    resolve: () => {
      if (resolve != null) {
        resolve();
      }
    },
  };
}

class BlockingQueueApi implements IVideoStatsApi {
  private readonly secondSaveGate = createDeferred();
  private createCalls = 0;

  public savedStates: VideoObject[] = [];

  async getVideoStatus(_id: string): Promise<BatchResponse<VideoOpenStatus>> {
    return { ok: true, status: 200, body: { Exists: false, HasHighWatchtime: false, AdjustedWatchRatio: 0 } };
  }

  async createOrUpdateVideo(item: VideoObject): Promise<BatchResponse<string | Record<string, unknown>>> {
    this.createCalls++;
    this.savedStates.push(JSON.parse(JSON.stringify(item)) as VideoObject);

    if (this.createCalls === 2) {
      await this.secondSaveGate.promise;
    }

    return { ok: true, status: 204, body: "" };
  }

  releaseSecondSave(): void {
    this.secondSaveGate.resolve();
  }
}

class RecordingApi implements IVideoStatsApi {
  public savedStates: VideoObject[] = [];

  async getVideoStatus(_id: string): Promise<BatchResponse<VideoOpenStatus>> {
    return { ok: true, status: 200, body: { Exists: false, HasHighWatchtime: false, AdjustedWatchRatio: 0 } };
  }

  async createOrUpdateVideo(item: VideoObject): Promise<BatchResponse<string | Record<string, unknown>>> {
    this.savedStates.push(JSON.parse(JSON.stringify(item)) as VideoObject);
    return { ok: true, status: 204, body: "" };
  }
}

describe("VideoStatsManager", () => {
  it("owns session state and persists on begin + stop", async () => {
    await SilentConsole.run(async () => {
      const api = new FakeApi();
      const manager = new VideoStatsManager(api, new SilentLogger());

      await manager.beginSession({
        videoId: "v1",
        videoTitle: "Video",
        videoAuthor: "Author",
        videoLength: 300,
        isShort: false,
      });

      expect(manager.hasActiveSession()).toBe(true);
      expect(api.persistedCount).toBe(1);

      await manager.stopSession();
      expect(api.persistedCount).toBe(2);
      expect(manager.hasActiveSession()).toBe(false);
    });
  });

  it("returns already-open status via manager API integration", async () => {
    await SilentConsole.run(async () => {
      const api = new FakeApi({ Exists: true, HasHighWatchtime: true, AdjustedWatchRatio: 0.72 });
      const manager = new VideoStatsManager(api, new SilentLogger());

      const status = await manager.getVideoOpenStatus("existing-id");

      expect(status.Exists).toBe(true);
      expect(status.HasHighWatchtime).toBe(true);
      expect(status.AdjustedWatchRatio).toBe(0.72);
    });
  });

  it("persists on stopped transition and keeps sessions for short loops", async () => {
    await SilentConsole.run(async () => {
      const api = new FakeApi();
      const manager = new VideoStatsManager(api, new SilentLogger());

      await manager.beginSession({
        videoId: "s1",
        videoTitle: "Short",
        videoAuthor: "Author",
        videoLength: 30,
        isShort: true,
      });

      manager.handleTick({ playerState: 1, currentTimeSeconds: 0, playbackRate: 1 }, 0);
      manager.handleTick({ playerState: 1, currentTimeSeconds: 4.5, playbackRate: 1 }, 4500);
      manager.handleTick({ playerState: 1, currentTimeSeconds: 0.1, playbackRate: 1 }, 5000);
      manager.handleTick({ playerState: 0, currentTimeSeconds: 0.1, playbackRate: 1 }, 5500);

      await manager.stopSession();

      const saved = api.latest;
      expect(saved).not.toBeUndefined();
      expect(saved?.VideoID).toBe("s1");
      expect(saved?.Watches.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("applies playback-rate weighted watchtime", async () => {
    await SilentConsole.run(async () => {
      const api = new FakeApi();
      const manager = new VideoStatsManager(api, new SilentLogger());

      await manager.beginSession({
        videoId: "rate-1",
        videoTitle: "Rate",
        videoAuthor: "Author",
        videoLength: 600,
        isShort: false,
      });

      manager.handleTick({ playerState: 1, currentTimeSeconds: 0, playbackRate: 1.25 }, 0);
      manager.handleTick({ playerState: 1, currentTimeSeconds: 240, playbackRate: 1.25 }, 240_000);
      manager.handleTick({ playerState: 1, currentTimeSeconds: 300, playbackRate: 2 }, 300_000);

      expect(Math.round(manager.getActiveWatchSeconds())).toBe(420);
    });
  });

  it("keeps queued save payload snapshots immutable", async () => {
    await SilentConsole.run(async () => {
      const api = new BlockingQueueApi();
      const manager = new VideoStatsManager(api, new SilentLogger());

      await manager.beginSession({
        videoId: "queue-immutability",
        videoTitle: "Queue",
        videoAuthor: "Author",
        videoLength: 600,
        isShort: false,
      });

      manager.handleTick({ playerState: 1, currentTimeSeconds: 0, playbackRate: 1 }, 0);
      manager.handleTick({ playerState: 1, currentTimeSeconds: 15, playbackRate: 1 }, 15_000);

      manager.handleTick({ playerState: 1, currentTimeSeconds: 31, playbackRate: 1 }, 31_000);

      api.releaseSecondSave();
      await manager.stopSession();

      const firstQueuedSave = api.savedStates[1];
      const secondQueuedSave = api.savedStates[2];
      const firstQueuedWatch = firstQueuedSave.Watches[firstQueuedSave.Watches.length - 1]?.WatchedLength;
      const secondQueuedWatch = secondQueuedSave.Watches[secondQueuedSave.Watches.length - 1]?.WatchedLength;

      expect(firstQueuedWatch).toBe(15);
      expect(secondQueuedWatch).toBe(31);
    });
  });

  it("saves a visible-not-played session as 0 on stop", async () => {
    await SilentConsole.run(async () => {
      const api = new RecordingApi();
      const manager = new VideoStatsManager(api, new SilentLogger());

      await manager.beginSession({
        videoId: "visible-no-play",
        videoTitle: "Visible",
        videoAuthor: "Author",
        videoLength: 120,
        isShort: false,
      });

      manager.handleTick({ playerState: 2, currentTimeSeconds: 0, playbackRate: 1 }, 1000);
      await manager.stopSession();

      const finalSaved = api.savedStates[api.savedStates.length - 1];
      expect(finalSaved.Watches.length).toBe(1);
      expect(finalSaved.Watches[0]?.WatchedLength).toBe(0);
    });
  });

  it("saves started-and-paused session with watched seconds", async () => {
    await SilentConsole.run(async () => {
      const api = new RecordingApi();
      const manager = new VideoStatsManager(api, new SilentLogger());

      await manager.beginSession({
        videoId: "pause-after-play",
        videoTitle: "Pause",
        videoAuthor: "Author",
        videoLength: 300,
        isShort: false,
      });

      manager.handleTick({ playerState: 1, currentTimeSeconds: 0, playbackRate: 1 }, 0);
      manager.handleTick({ playerState: 2, currentTimeSeconds: 7, playbackRate: 1 }, 7000);
      await manager.stopSession();

      const finalSaved = api.savedStates[api.savedStates.length - 1];
      expect(finalSaved.Watches.length).toBe(1);
      expect(finalSaved.Watches[0]?.WatchedLength).toBe(7);
    });
  });

  it("saves current watched seconds when session is stopped while still playing", async () => {
    await SilentConsole.run(async () => {
      const api = new RecordingApi();
      const manager = new VideoStatsManager(api, new SilentLogger());

      await manager.beginSession({
        videoId: "close-while-playing",
        videoTitle: "Close",
        videoAuthor: "Author",
        videoLength: 300,
        isShort: false,
      });

      manager.handleTick({ playerState: 1, currentTimeSeconds: 0, playbackRate: 1 }, 0);
      manager.handleTick({ playerState: 1, currentTimeSeconds: 7, playbackRate: 1 }, 7000);
      await manager.stopSession();

      const finalSaved = api.savedStates[api.savedStates.length - 1];
      expect(finalSaved.Watches.length).toBe(1);
      expect(finalSaved.Watches[0]?.WatchedLength).toBe(7);
    });
  });

  it("keeps initial session as -99 when never focused/played", async () => {
    await SilentConsole.run(async () => {
      const api = new RecordingApi();
      const manager = new VideoStatsManager(api, new SilentLogger());

      await manager.beginSession({
        videoId: "never-focused",
        videoTitle: "Background",
        videoAuthor: "Author",
        videoLength: 240,
        isShort: false,
      });

      await manager.stopSession();

      const finalSaved = api.savedStates[api.savedStates.length - 1];
      expect(finalSaved.Watches.length).toBe(1);
      expect(finalSaved.Watches[0]?.WatchedLength).toBe(-99);
    });
  });

  it("keeps initial session as -99 when never focused/played event, without stopping session", async () => {
    await SilentConsole.run(async () => {
      const api = new RecordingApi();
      const manager = new VideoStatsManager(api, new SilentLogger());

      await manager.beginSession({
        videoId: "never-focused",
        videoTitle: "Background",
        videoAuthor: "Author",
        videoLength: 240,
        isShort: false,
      });

      const finalSaved = api.savedStates[api.savedStates.length - 1];
      expect(finalSaved.Watches.length).toBe(1);
      expect(finalSaved.Watches[0]?.WatchedLength).toBe(-99);
    });
  });
});
