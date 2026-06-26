import { GM, type GmXmlhttpRequestOption } from "$";

export type WatchEntry = { WatchedLength: number; Date: Date | string | null };
type WatchEntryPayload = { WatchedLength: number; Date: string | null };
type VideoObjectPayload = Omit<VideoObject, "Watches"> & { Watches?: WatchEntryPayload[] };
//type StringOccasion = { value: string, timestamp: string };
export type VideoObject = {
  VideoID: string;
  VideoTitle: string;
  VideoAuthor: string;
  /*
  VideoTitles: StringOccasion[];
  VideoAuthors: StringOccasion[];
  */ 
  VideoLength: number;
  IsShort: boolean;
  Watches: WatchEntry[];
};

export type VideoOpenStatus = {
  Exists: boolean;
  HasHighWatchtime: boolean;
  AdjustedWatchRatio: number;
};

export type BatchResponse<T> = SuccessBatchResponse<T> | FailureBatchResponse;
export type SuccessBatchResponse<T> = {
  ok: true;
  status: number;
  body: T;
}
export type FailureBatchResponse = {
  ok: false;
  status: number;
  error: string;
}

export class ApiService {
  baseUrl: string;
  headers: Record<string, string> = { "Content-Type": "application/json" };

  constructor(baseUrl = "http://localhost:5458/") {
    this.baseUrl = baseUrl.replace(/\/$/, "");

    if (!GM || typeof GM.xmlHttpRequest !== "function") {
      throw new Error("GM.xmlHttpRequest is not available in this environment");
    }
  }

  // low-level transport: use GM.xmlHttpRequest (userscript runtime only)
  private async transport(path: string, opts: { method?: string; body?: string | Record<string, unknown>; timeoutMs?: number } = {}): Promise<{ status: number; bodyText: string }> {
    const url = this.baseUrl + path;
    const method = (opts.method || "GET").toUpperCase();
    const timeoutMs = opts.timeoutMs || 60000;

    const req: GmXmlhttpRequestOption<"text"> = {
      method,
      url,
      headers: this.headers,
      timeout: timeoutMs,
      responseType: "text",
      data:
        opts.body !== undefined
          ? typeof opts.body === "string"
            ? opts.body
            : JSON.stringify(opts.body)
          : undefined,
    };

    const res = await GM.xmlHttpRequest(req);
    return { status: res.status, bodyText: res.response };
  }

  // request with retries (exponential backoff + jitter)
  async requestWithRetry(path: string, opts: { method?: string; body?: string | Record<string, unknown>; timeoutMs?: number } = {}, retries = 3): Promise<{ status: number; bodyText: string }> {
    let attempt = 0;
    const baseDelay = 300; // ms
    console.debug(`API request: ${opts.method || "GET"} ${path} (retries: ${retries})`);
    while (true) {
      try {
        return await this.transport(path, opts);
      } catch (err) {
        attempt++;
        if (attempt > retries) throw err;
        const jitter = Math.floor(Math.random() * 200);
        const delay = Math.pow(2, attempt) * baseDelay + jitter;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // chunk helper
  private chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  private toVideoObjectPayload(item: VideoObject): VideoObjectPayload {
    if (!item.Watches) return item as VideoObjectPayload;
    return {
      ...item,
      Watches: item.Watches.filter((entry) => (entry.Date !== "unknown" && entry.Date !== null) || entry.WatchedLength !== null).map((entry) => ({
        ...entry,
        Date:
          entry.Date == null || entry.Date === "unknown"
            ? null
            : new Date(entry.Date).toISOString(),
        WatchedLength: Math.round(entry.WatchedLength),
      })),
    };
  }

  // Upload many video objects in batches
  async uploadVideosBatch(items: VideoObject[], batchSize = 100): Promise<BatchResponse<string | Record<string, unknown>>[]> {
    if (!Array.isArray(items) || items.length === 0) return [];
    const chunks = this.chunk(items.map((item) => this.toVideoObjectPayload(item)), batchSize);
    const results: BatchResponse<string | Record<string, unknown>>[] = [];
    for (const chunk of chunks) {
      try {
        const { status, bodyText } = await this.requestWithRetry(`/api/videos/batch`, { method: 'POST', body: { items: chunk } }, 3);
        if (! (status >= 200 && status < 300)) {
          results.push({ ok: false, status, error: `Request failed with status ${status}\n\n${bodyText}` });
          continue;
        }
        let body: string | Record<string, unknown> = bodyText;
        try { body = JSON.parse(bodyText) as Record<string, unknown>; } catch { /* keep as string */ }
        results.push({ ok: true, status, body });
      } catch (err) {
        results.push({ ok: false, status: 0, error: String(err) });
      }
    }
    return results;
  }

  // Upload arrays of video ids as "scans"
  async uploadScansBatch(ids: string[], batchSize = 500): Promise<BatchResponse<string | Record<string, unknown>>[]> {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const chunks = this.chunk(ids, batchSize);
    const results: BatchResponse<string | Record<string, unknown>>[] = [];
    for (const chunk of chunks) {
      try {
        const { status, bodyText } = await this.requestWithRetry(`/api/scans/batch`, { method: 'POST', body: { ids: chunk } }, 3);
        if (! (status >= 200 && status < 300)) {
          results.push({ ok: false, status, error: `Request failed with status ${status}\n\n${bodyText}` });
          continue;
        }
        let body: string | Record<string, unknown> = bodyText;
        try { body = JSON.parse(bodyText) as Record<string, unknown>; } catch { /* keep as string */ }
        results.push({ ok: true, status, body });
      } catch (err) {
        results.push({ ok: false, status: 0, error: String(err) });
      }
    }
    return results;
  }

  // single resource operations
  async createOrUpdateVideo(item: VideoObject): Promise<BatchResponse<string | Record<string, unknown>>> {
    if (!item || !item.VideoID) throw new Error('VideoID required');
    const payload = this.toVideoObjectPayload(item);
    const { status, bodyText } = await this.requestWithRetry(`/api/VideoObjects/${encodeURIComponent(item.VideoID)}`, { method: 'PUT', body: payload }, 2);
    if (! (status >= 200 && status < 300)) {
      return { ok: false, status, error: `Request failed with status ${status}\n\n${bodyText}` };
    }
    let body: string | Record<string, unknown> = bodyText; try { body = JSON.parse(bodyText) as Record<string, unknown>; } catch { /* keep as string */ }
    return { ok: true, status, body };
  }

  async getVideo(id: string): Promise<BatchResponse<VideoObject>> {
    try {
      const { status, bodyText } = await this.requestWithRetry(`/api/VideoObjects/${encodeURIComponent(id)}`, { method: 'GET' }, 2);
      if (! (status >= 200 && status < 300)) {
        return { ok: false, status, error: `Request failed with status ${status}\n\n${bodyText}` };
      }
      let body: VideoObject = JSON.parse(bodyText) as VideoObject;
      return { ok: true, status, body };
    } catch (err) {
      return { ok: false, status: 0, error: String(err) };
    }
  }

  async getVideoStatus(id: string): Promise<BatchResponse<VideoOpenStatus>> {
    try {
      const { status, bodyText } = await this.requestWithRetry(`/api/VideoObjects/${encodeURIComponent(id)}/status`, { method: 'GET' }, 2);
      if (! (status >= 200 && status < 300)) {
        return { ok: false, status, error: `Request failed with status ${status}\n\n${bodyText}` };
      }
      const body: VideoOpenStatus = JSON.parse(bodyText) as VideoOpenStatus;
      return { ok: true, status, body };
    } catch (err) {
      return { ok: false, status: 0, error: String(err) };
    }
  }

  async addScan(videoId: string): Promise<BatchResponse<string | Record<string, unknown>>> {
    if (!videoId) throw new Error('videoId required');
    try {
      const { status, bodyText } = await this.requestWithRetry(`/api/scans`, { method: 'POST', body: { id: videoId } }, 2);
      if (! (status >= 200 && status < 300)) {
        return { ok: false, status, error: `Request failed with status ${status}\n\n${bodyText}` };
      }
      let body: string | Record<string, unknown> = bodyText; try { body = JSON.parse(bodyText) as Record<string, unknown>; } catch { /* keep as string */ }
      return { ok: true, status, body };
    } catch (err) {
      return { ok: false, status: 0, error: String(err) };
    }
  }

  // simple health probe
  async health(): Promise<BatchResponse<string | Record<string, unknown>>> {
    try {
      const { status, bodyText } = await this.requestWithRetry(`/api/health`, { method: 'GET' }, 1);
      if (! (status >= 200 && status < 300)) {
        return { ok: false, status, error: `Request failed with status ${status}\n\n${bodyText}` };
      }
      let body: string | Record<string, unknown> = bodyText; try { body = JSON.parse(bodyText) as Record<string, unknown>; } catch { /* keep as string */ }
      return { ok: true, status, body };
    } catch (err) {
      return { ok: false, status: 0, error: String(err) };
    }
  }
}

export default ApiService;
