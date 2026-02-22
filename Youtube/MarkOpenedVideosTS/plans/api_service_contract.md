# ApiService REST Contract

## Overview
This document defines a RESTful API contract and batch semantics for the userscript migration to a server-backed storage. The client service implementation will live at [`src/api/ApiService.ts`](src/api/ApiService.ts:1) and will replace direct calls in [`src/MarkOpenedVideos.user.js`](src/MarkOpenedVideos.user.js:1).

## Server & Auth
- Base URL: `https://tabnoc.goip.de`
- Authentication: HTTP Basic Auth. Client sends header:

  Authorization: Basic <base64(test:test)>

  (Credentials for testing: username `test`, password `test`.)

## Resources and Endpoints
Design follows collection/resource style with batch endpoints for efficient sync.

1) Videos (video metadata + watches)
- POST /api/videos/batch
  - Purpose: upsert a batch of video objects (create or merge watches)
  - Request: { "items": [ VideoObject ] }
  - Response: { "processed": n, "errors": [{ index, message }] }

- GET /api/videos/{videoId}
  - Purpose: fetch single video object
  - Response: VideoObject

- POST /api/videos/changes?since={timestamp}
  - Purpose: request server-side changes since timestamp (optional)
  - Response: { changes: [ { id, diff } ], serverTime }

2) Scans (scanned video id lists)
- POST /api/scans/batch
  - Purpose: send a batch of scanned video ids to mark as scanned
  - Request: { "items": ["videoId1","videoId2", ...] }
  - Response: { "processed": n }

3) Export / Import (admin/light client)
- GET /api/export?format=json
  - Purpose: return full save dump for client import
  - Response: { WatchedVideoArray, ScannedVideoArray, VideoObjectDictionary, versions }

4) Health
- GET /api/health
  - Response: { status: "ok", time: "ISO" }

## Batch Semantics
- Default max batch size: 100 items; client should split larger payloads.
- Server processes items idempotently: POST /api/videos/batch must be safe to retry.
- Upsert merging strategy for VideoObject: merge watches arrays by timestamp and keep max VideoLength; duplicate watches deduplicated by timestamp with tolerance 120s.
- Response includes per-item errors to allow partial success.

## Data Models (JSON)
VideoObject:
{
  "videoId": "abc123",
  "title": "...",
  "author": "...",
  "videoLength": 123,
  "watches": [ { "watchedLength": 12, "date": "2026-02-08T10:00:00Z" }, ... ]
}

BatchRequest (videos):
{
  "items": [ VideoObject ],
  "clientTime": "ISO timestamp optional"
}

ScansBatch:
{
  "items": [ "videoId1", "videoId2" ],
  "clientTime": "ISO" 
}

BatchResponse:
{
  "processed": 42,
  "errors": [ { "index": 3, "message": "invalid id" } ],
  "serverTime": "ISO"
}

## Error Handling and Status Codes
- 200 OK: request processed; body contains processed count and optional errors
- 400 Bad Request: malformed payload
- 401 Unauthorized: bad basic auth
- 429 Too Many Requests: respect Retry-After header
- 500 Server Error: transient; client should retry with backoff

## Client Retry & Backoff
- Exponential backoff with jitter, max retries configurable (default 5).
- Retry on network errors and 5xx responses; do not retry on 4xx except 429.

## Conflict Resolution
- Server merges watches deterministically (see merge rules above).
- Client may provide an optional client-generated request id header `X-Client-Request-Id` to help dedupe.

## Offline & Local Queue
Client will queue failed batch requests in local storage and retry in background. Queue persistence uses existing GM_* helpers during migration; plan to keep local queue keys:
- `ApiQueue:videos`
- `ApiQueue:scans`

## Integration Notes
- Implement TypeScript interfaces and ApiService at [`src/api/ApiService.ts`](src/api/ApiService.ts:1).
- Replace the `GM_xmlhttpRequest` calls in [`src/MarkOpenedVideos.user.js`](src/MarkOpenedVideos.user.js:3465) (the sync flow) with ApiService.batchUploadVideos / ApiService.batchUploadScans.
- Provide a small migration helper to export current local data and push to server once ApiService is configured.

## Defaults for Implementation
- baseUrl = https://tabnoc.goip.de
- auth = Basic (test:test) for development; allow configuration via script menu or settings in [`src/MarkOpenedVideos.user.js`](src/MarkOpenedVideos.user.js:1).
- defaultBatchSize = 100

## Next steps (implementation)
- Create [`src/api/ApiService.ts`](src/api/ApiService.ts:1) implementing this contract.
- Add TypeScript models in [`src/api/models.ts`](src/api/models.ts:1).

```mermaid
flowchart LR
  A[Client Queue] --> B[ApiService: batchUpload]
  B --> C[/api/videos/batch]
  B --> D[/api/scans/batch]
  C --> E{200 OK}
  C --> F{5xx -> retry}
```

