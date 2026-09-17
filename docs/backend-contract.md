# Backend Contract

Backend-agnostic integrator spec for **`mediastream-upload`**. Implement these four methods (and optional playback) in any language/storage. Reference HTTP adapters: Cloudflare Worker/R2 and PHP/S3 — **same wire shape**.

The client library does **not** talk to object storage directly. Your server owns multipart sessions, auth, and Range playback.

---

## 1. Interface (language-neutral)

```text
init(metadata) → { uploadId }

sendChunk(uploadId, sequenceNumber, checksum, bytes, options?) → void
  options.replace?: boolean   # Part 0 same-size rewrite

finalize(uploadId, totalChunks, options?) → { videoUrl, abrupt?, seekRepairStatus? }
  options.abrupt?: boolean    # pagehide / keepalive path

abort(uploadId, reason) → void
```

`sequenceNumber` is **0-based**. Storage multipart part numbers are typically `sequenceNumber + 1`.

---

## 2. Required Behaviors

1. **Sequence idempotency** — Duplicate `sequenceNumber` + same checksum → no-op. Different checksum without `replace` → conflict. With `replace: true`, overwrite Part 0 / sequence 0 when bytes/checksum change (same length).
2. **Completeness** — Finalize must verify every sequence in `0 … totalChunks - 1` (gap check), not count-only.
3. **Atomic part tracking** — Persist part ids (ETags) in a strongly consistent store so retries never race maps.
4. **Seekability & playback** — Normal End: client delivers patched Part 0 + trailing Cues. Abrupt: async repair **or** document weak seek. Playback must support HTTP Range (`206`, `Accept-Ranges: bytes`).
5. **Zero-chunk hygiene** — Never complete with zero parts; reject `totalChunks < 1`.
6. **Storage hygiene** — Lifecycle cleanup (~24h) for abandoned multipart uploads.
7. **Security** — Auth, rate limits, size/duration caps are entirely yours.

`seekRepairStatus`: `none` | `pending` | `done` | `failed` | `skipped` (optional `processing` while a worker claims the job).

---

## 3. Suggested HTTP Wire (reference adapters)

| # | Method | Path | Maps to |
|---|--------|------|---------|
| 1 | `POST` | `/uploads` | `init` |
| 2 | `PUT` | `/uploads/{uploadId}/chunks/{sequenceNumber}` | `sendChunk` |
| 3 | `POST` | `/uploads/{uploadId}/finalize` | `finalize` |
| 4 | `POST` | `/uploads/{uploadId}/abort` | `abort` |
| 5 | `GET` | `/uploads/{uploadId}` (or signed URL) | Playback + Range |
| 6 | `GET` | `/uploads/{uploadId}/status` | Optional status poll |

### `POST /uploads`

Request: `{ "contentType": "video/webm" }` (empty body OK).  
Response `201`: `{ "uploadId": "<uuid>" }`.

### `PUT …/chunks/{sequenceNumber}`

Headers: `Content-Type: application/octet-stream`, `X-Checksum-SHA256: <hex>`.  
Optional replace: `X-Replace-Part: 1` and/or `?replace=1`.  
Success: `204`. Conflicts: `409`. Unknown: `404`.

### `POST …/finalize`

Body: `{ "totalChunks": N, "abrupt": false }`. Keep small for keepalive.  
Response `200`: `{ "videoUrl", "abrupt?", "seekRepairStatus?" }`. Idempotent if already completed.

### `POST …/abort`

Body: `{ "reason": "…" }`. Response `204`. Do not abort completed uploads (`409`).

### Playback

Prefer repaired object when `seekRepairStatus === "done"`. Require Range support.

---

## 4. Multipart Storage Mapping (S3/R2-shaped)

| Client | Storage |
|--------|---------|
| `init` | CreateMultipartUpload |
| `sendChunk` | UploadPart (`PartNumber = sequence + 1`) |
| `sendChunk` + replace | Re-UploadPart part 1; keep latest ETag |
| `finalize` | CompleteMultipartUpload (sorted parts) |
| `abort` | AbortMultipartUpload |
| Abrupt repair | GetObject → patch → PutObject (`*.seekable.webm`) |

**Hard rules:** Non-final parts ≥ 5 MiB; client seals non-final at exactly 5 MiB; replace Part 0 keeps same byte length.

---

## 5. Abrupt Seek Repair (Track B)

When `finalize({ abrupt: true })` succeeds:

1. Optionally skip if object too large → `skipped`.
2. Scan clusters (bound unknown-size correctly — Track C).
3. Same-size Duration + SeekHead if voids reserved; append Cues.
4. Store repaired key; set `seekRepairStatus` to `done` / `failed` / `skipped`.
5. Do not block the finalize HTTP response on repair.

Algorithm reference: package `webmSeekRepair` / `repairAbruptWebmSeekability` (pure EBML).

---

## 6. End-to-End Checklists

### Normal End

1. init → many PUT chunks → optional Part 0 replace → final undersized part → finalize → Range scrub works

### Abrupt ≥1 ACKed

1. finalize abrupt → `pending` → repair → `done` → playback prefers repaired key

### Abrupt 0 ACKed

1. abort only — no completed URL

---

## 7. Acceptance Tests (backend)

1. Short (< 5 MiB) and long (≥ one 5 MiB part) normal End seek
2. Duplicate chunk same checksum → idempotent
3. Checksum conflict without replace → 409
4. Gap finalize → 409 + `missing` list
5. Abrupt ≥1 and abrupt 0
6. Range `206`
7. Abort mid-upload
8. Double finalize idempotent
9. Single-winner abrupt repair claim

---

## 8. Reference Adapters in this Package

| Entry | Factory | Target |
|-------|---------|--------|
| `mediastream-upload/adapters/r2` | `createR2Backend(baseUrl)` | Cloudflare Worker + R2-shaped API |
| `mediastream-upload/adapters/s3` | `createS3Backend(baseUrl)` | PHP/S3-shaped API |

Shared implementation: `adapters/http-base.ts`. Swapping adapters proves the core is backend-agnostic.
