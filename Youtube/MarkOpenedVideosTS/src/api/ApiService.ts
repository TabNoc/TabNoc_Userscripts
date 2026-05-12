import { GM } from "$";


type WatchEntry = { WatchedLength: number; Date: string | null };
export type VideoObject = {
  VideoID: string;
  VideoTitle?: string;
  VideoAuthor?: string;
  VideoLength?: number;
  Watches?: WatchEntry[];
};

export type BatchResponse = {
  ok: boolean;
  status: number;
  body?: any;
  error?: string;
};

export class ApiService {
  baseUrl: string;
  headers: Record<string, string> = { "Content-Type": "application/json" };

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl.replace(/\/$/, "");

    if (!GM || typeof GM.xmlHttpRequest !== "function") {
      throw new Error("GM.xmlHttpRequest is not available in this environment");
    }
  }

  // low-level transport: use GM.xmlHttpRequest (userscript runtime only)
  private async transport(path: string, opts: { method?: string; body?: any; timeoutMs?: number } = {}): Promise<{ status: number; bodyText: string; body?: any }> {
    const url = this.baseUrl + path;
    const method = (opts.method || "GET").toUpperCase();
    const timeoutMs = opts.timeoutMs || 60000;

    const req: any = {
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

    const res = await GM.xmlHttpRequest(req as any);
    const bodyText = typeof res.response === "string" ? res.response : "";
    return { status: res.status, bodyText };
  }

  // request with retries (exponential backoff + jitter)
  async requestWithRetry(path: string, opts: { method?: string; body?: any; timeoutMs?: number } = {}, retries = 3): Promise<{ status: number; bodyText: string; body?: any }> {
    let attempt = 0;
    const baseDelay = 300; // ms
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

  // Upload many video objects in batches
  async uploadVideosBatch(items: VideoObject[], batchSize = 100): Promise<BatchResponse[]> {
    if (!Array.isArray(items) || items.length === 0) return [];
    const chunks = this.chunk(items, batchSize);
    const results: BatchResponse[] = [];
    for (const chunk of chunks) {
      try {
        const { status, bodyText } = await this.requestWithRetry(`/api/videos/batch`, { method: 'POST', body: { items: chunk } }, 3);
        let body: any;
        try { body = JSON.parse(bodyText); } catch (e) { body = bodyText; }
        results.push({ ok: status >= 200 && status < 300, status, body });
      } catch (err: any) {
        results.push({ ok: false, status: 0, error: String(err) });
      }
    }
    return results;
  }

  // Upload arrays of video ids as "scans"
  async uploadScansBatch(ids: string[], batchSize = 500): Promise<BatchResponse[]> {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const chunks = this.chunk(ids, batchSize);
    const results: BatchResponse[] = [];
    for (const chunk of chunks) {
      try {
        const { status, bodyText } = await this.requestWithRetry(`/api/scans/batch`, { method: 'POST', body: { ids: chunk } }, 3);
        let body: any;
        try { body = JSON.parse(bodyText); } catch (e) { body = bodyText; }
        results.push({ ok: status >= 200 && status < 300, status, body });
      } catch (err: any) {
        results.push({ ok: false, status: 0, error: String(err) });
      }
    }
    return results;
  }

  // single resource operations
  async createOrUpdateVideo(item: VideoObject): Promise<BatchResponse> {
    if (!item || !item.VideoID) throw new Error('VideoID required');
    try {
      const { status, bodyText } = await this.requestWithRetry(`/api/videos/${encodeURIComponent(item.VideoID)}`, { method: 'PUT', body: item }, 2);
      let body: any; try { body = JSON.parse(bodyText); } catch (e) { body = bodyText; }
      return { ok: status >= 200 && status < 300, status, body };
    } catch (err: any) {
      return { ok: false, status: 0, error: String(err) };
    }
  }

  async addScan(videoId: string): Promise<BatchResponse> {
    if (!videoId) throw new Error('videoId required');
    try {
      const { status, bodyText } = await this.requestWithRetry(`/api/scans`, { method: 'POST', body: { id: videoId } }, 2);
      let body: any; try { body = JSON.parse(bodyText); } catch (e) { body = bodyText; }
      return { ok: status >= 200 && status < 300, status, body };
    } catch (err: any) {
      return { ok: false, status: 0, error: String(err) };
    }
  }

  // simple health probe
  async health(): Promise<{ ok: boolean; status: number; body?: any }> {
    try {
      const { status, bodyText } = await this.requestWithRetry(`/api/health`, { method: 'GET' }, 1);
      let body: any; try { body = JSON.parse(bodyText); } catch (e) { body = bodyText; }
      return { ok: status >= 200 && status < 300, status, body };
    } catch (err: any) {
      return { ok: false, status: 0, body: String(err) };
    }
  }
}

export default ApiService;
