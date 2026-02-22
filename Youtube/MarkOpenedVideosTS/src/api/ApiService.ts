/*
  ApiService - TypeScript
  - RESTful collection/resource style
  - batching helpers
  - retries with exponential backoff + jitter
  - uses GM_xmlhttpRequest when available, falls back to fetch
*/

export type WatchEntry = {
  WatchedLength: number;
  Date: string | null; // ISO string or "unknown"
};

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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export class ApiService {
  baseUrl: string;
  defaultBatchSize = 100;
  maxRetries = 4;
  authHeader?: string;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  setBasicAuth(user: string, pass: string) {
    this.authHeader = "Basic " + btoa(`${user}:${pass}`);
  }

  setBearer(token: string) {
    this.authHeader = `Bearer ${token}`;
  }

  private buildHeaders(extra?: Record<string, string>) {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      ...(extra || {}),
    };
    if (this.authHeader) h["Authorization"] = this.authHeader;
    return h;
  }

  private async transport(path: string, opts: { method: string; body?: any; headers?: Record<string, string>; timeout?: number; }): Promise<{ status: number; text: string }> {
    const url = (path.startsWith("http") ? path : `${this.baseUrl}${path}`);
    const bodyText = opts.body == null ? undefined : (typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body));

    // Prefer GM_xmlhttpRequest when available (userscript environment)
    if (typeof (globalThis as any).GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        try {
          (globalThis as any).GM_xmlhttpRequest({
            method: opts.method,
            url,
            data: bodyText,
            headers: opts.headers || this.buildHeaders(),
            timeout: opts.timeout || 60_000,
            onload: (res: any) => resolve({ status: res.status, text: res.responseText }),
            onerror: (err: any) => reject(err),
            ontimeout: (err: any) => reject(err),
            onabort: (err: any) => reject(err),
          });
        } catch (e) {
          reject(e);
        }
      });
    }

    // fallback to fetch
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = opts.timeout || 60_000;
    if (controller) setTimeout(() => controller!.abort(), timeout);
    const res = await fetch(url, {
      method: opts.method,
      headers: opts.headers || this.buildHeaders(),
      body: bodyText,
      signal: controller ? controller.signal : undefined,
    });
    const text = await res.text();
    return { status: res.status, text };
  }

  private async requestWithRetry(path: string, opts: { method: string; body?: any; headers?: Record<string, string>; timeout?: number }, retries = this.maxRetries): Promise<{ status: number; bodyText: string }> {
    let attempt = 0;
    while (true) {
      try {
        const res = await this.transport(path, opts);
        return { status: res.status, bodyText: res.text };
      } catch (err) {
        attempt++;
        if (attempt > retries) throw err;
        const backoff = Math.min(5_000 * Math.pow(2, attempt - 1), 30_000);
        const jitter = Math.random() * 300;
        await sleep(backoff + jitter);
      }
    }
  }

  // Collection endpoints - batching helpers
  async uploadVideosBatch(items: VideoObject[], batchSize = this.defaultBatchSize): Promise<BatchResponse[]> {
    const groups = chunk(items, batchSize);
    const out: BatchResponse[] = [];
    for (const g of groups) {
      try {
        const { status, bodyText } = await this.requestWithRetry(`/api/videos/batch`, { method: "POST", body: { items: g }, headers: this.buildHeaders() });
        let body = null;
        try { body = JSON.parse(bodyText); } catch { body = bodyText; }
        out.push({ ok: status >= 200 && status < 300, status, body });
      } catch (e: any) {
        out.push({ ok: false, status: 0, error: String(e) });
      }
    }
    return out;
  }

  async uploadScansBatch(ids: string[], batchSize = this.defaultBatchSize): Promise<BatchResponse[]> {
    const groups = chunk(ids, batchSize);
    const out: BatchResponse[] = [];
    for (const g of groups) {
      try {
        const { status, bodyText } = await this.requestWithRetry(`/api/scans/batch`, { method: "POST", body: { ids: g }, headers: this.buildHeaders() });
        let body = null;
        try { body = JSON.parse(bodyText); } catch { body = bodyText; }
        out.push({ ok: status >= 200 && status < 300, status, body });
      } catch (e: any) {
        out.push({ ok: false, status: 0, error: String(e) });
      }
    }
    return out;
  }

  // Single resource helpers
  async createOrUpdateVideo(item: VideoObject): Promise<BatchResponse> {
    const id = encodeURIComponent(item.VideoID);
    try {
      const { status, bodyText } = await this.requestWithRetry(`/api/videos/${id}`, { method: "PUT", body: item, headers: this.buildHeaders() });
      let body = null; try { body = JSON.parse(bodyText); } catch { body = bodyText; }
      return { ok: status >= 200 && status < 300, status, body };
    } catch (e: any) {
      return { ok: false, status: 0, error: String(e) };
    }
  }

  async addScan(videoId: string): Promise<BatchResponse> {
    try {
      const { status, bodyText } = await this.requestWithRetry(`/api/scans`, { method: "POST", body: { id: videoId }, headers: this.buildHeaders() });
      let body = null; try { body = JSON.parse(bodyText); } catch { body = bodyText; }
      return { ok: status >= 200 && status < 300, status, body };
    } catch (e: any) {
      return { ok: false, status: 0, error: String(e) };
    }
  }

  // Health check / small helpers
  async health(): Promise<{ ok: boolean; status: number; body?: any }> {
    try {
      const { status, bodyText } = await this.requestWithRetry(`/api/health`, { method: "GET" });
      let body = null; try { body = JSON.parse(bodyText); } catch { body = bodyText; }
      return { ok: status >= 200 && status < 300, status, body };
    } catch (e: any) {
      return { ok: false, status: 0, body: String(e) };
    }
  }
}
