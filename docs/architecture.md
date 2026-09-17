# Architecture

**Package:** `mediastream-upload`  
**Status:** Frozen for Phase 1 extraction (behavior matches the proven reference implementation; packaging only).

This document describes how the library turns live browser `MediaStream`s into an incrementally uploaded, seekable WebM artifact — without the host managing recording, buffering, retries, or seek repair.

---

## 1. Problem & Scope

### Problem

Typical browser recording waits until the session ends, then uploads one large blob. That adds tens of seconds of dead time after the user is done.

### Goal

Composite live sources, record continuously, and upload sealed multipart chunks **during** the session so that by natural end, only a short finalize tail remains.

### Scope (deliberately minimal)

**Developer provides:**

| Input | Required | Description |
|-------|----------|-------------|
| `sources.main` | Yes | Primary visual/audio source (`MediaStream` or `HTMLVideoElement` with a `MediaStream` `srcObject`) |
| `sources.pip` | No | Picture-in-picture overlay (e.g. camera) |
| `backend` | Yes | Four methods: `init`, `sendChunk`, `finalize`, `abort` |

**Library owns:** compositing, audio mix, `MediaRecorder`, batching, FIFO upload, retries, backpressure, seekability (Tracks A/B/C), crash/unload best-effort, MIME/feature fallback signaling.

**Host owns:** auth, privacy UX, what “paused” means when `backpressured`, post-failure recovery product flows.

### Out of scope (Phase 1)

- Framework wrappers (React/Vue/Svelte)
- Publish CI automation (manual Changesets only)
- True cross-reload resumability, IndexedDB buffering, fragmented MP4 / Safari chunk path

---

## 2. Prior Art

| Project | Relevance | Why not adopted as-is |
|---------|-----------|------------------------|
| **tus / tus-js-client** | Resumable upload protocol; `uploadLengthDeferred` fits live size | Would force every backend to be tus-compliant; conflicts with bring-your-own-backend |
| **Uppy** | Modular uploader, strong DX | Not a live `MediaRecorder` + composite primitive |
| **Mux UpChunk** | Chunked PUT + retry | Assumes known-size `File`/`Blob`, not open-ended live streams |
| **Mux MediaRecorder streaming example** | Buffer → sequential PUT → backoff | Demo, not a library; validates the approach |
| **RecordRTC** | Makes individual chunks independently decodable | v1 uses ordered byte-append of WebM clusters instead |

**Conclusion:** No mature OSS library combines multi-source composite recording + incremental upload + backend-agnostic contract + seekable WebM. That gap is intentional product scope.

---

## 3. Render Engine (Compositor)

| Concern | Decision |
|---------|----------|
| Visual layout | Main source full-frame on canvas; optional PiP inset (rounded rect + stroke) |
| Default canvas | `1280×720`, PiP `320×180`, margin `12px`, corner `"top-left"` (all overridable via start options including `pipPosition`) |
| Frame cadence | Web Worker `setInterval` at `1000/fps` ms; **draw** stays on main thread |
| Why not `requestAnimationFrame` | Background tabs throttle/pause rAF → frozen video while audio continues |
| Why not full `OffscreenCanvas` | Unnecessary complexity for this problem |
| Capture | `canvas.captureStream(fps)` supplies video track(s) |

Draw sources: `MediaStream` → owned muted `<video>`; or host `HTMLVideoElement` (muted when `srcObject` is a stream to avoid feedback).

---

## 4. Audio Pipeline

`canvas.captureStream()` is video-only. Audio is mixed separately:

1. Resolve each source to a `MediaStream` (`MediaStream` itself, or `HTMLVideoElement.srcObject` / `captureStream`).
2. Extract audio tracks → `AudioContext.createMediaStreamSource` → `MediaStreamAudioDestinationNode`.
3. Append destination audio track(s) to canvas video track(s) → combined stream for `MediaRecorder`.
4. Optional `playbackToSpeakers` routes main audio to `audioContext.destination` (default: true for live streams, false for file-backed video).
5. `AudioContext` created/resumed in `start()` — host must call `start()` from a user gesture.

Sources without a usable `MediaStream` throw `SourceInitializationError` rather than silently recording video-only.

---

## 5. Recording & MIME

- `MediaRecorder` with ~1s timeslice, preferred MIME: `video/webm;codecs=vp9,opus` → `vp8,opus` → `video/webm`.
- Feature gate: `MediaRecorder` + `canvas.captureStream` + `isTypeSupported('video/webm')`.
- Unsupported browsers → `UnsupportedBrowserError` (host may fall back to single-blob upload outside this library).
- WebM cluster concat is valid for ordered append; MP4/Safari chunk-concat is **not** solved in v1.

Configurable defaults: `videoBitsPerSecond: 2_500_000`, `audioBitsPerSecond: 128_000`, `fps: 30`.

---

## 6. Queue, Batching & Upload

| Rule | Value | Rationale |
|------|-------|-----------|
| Part size | Exactly **5 MiB** non-final parts | R2/S3 multipart minimum for non-final parts |
| Batch timer | **15s** | Does **not** force undersized non-final seals |
| Slice policy | Never mid-`Blob` across cluster boundaries | Preserve WebM integrity |
| Concurrency | `maxConcurrency: 1` FIFO | Ordering solved once in the library |
| Idempotency | `sequenceNumber` + SHA-256 checksum | Safe retries |
| Retry | 3 attempts, exp backoff + jitter, cap ~10s | Bounded resilience |
| Chunk 0 | Hard prerequisite | Exhausted retries → `Chunk0FatalError` / `failed`; abort upload |
| Part 0 replace | `sendChunk(..., { replace: true })` | Same-size Duration/SeekHead rewrite |
| Degraded | ≥ **15 MiB** pending | State `degraded` |
| Backpressured | ≥ **50 MiB** pending | Pause `MediaRecorder`, stop new frames; state `backpressured` |

`acknowledgedChunks` counts ACKed **non-replace** parts only (Part 0 rewrite must not inflate `totalChunks`).

---

## 7. Seekability (Zero Dependency)

Seekability is solved **inside** the package via EBML utilities (`src/internal/webmSeekRepair.ts`). No `fix-webm-duration` or other runtime deps.

### Track A — Normal End (client)

1. On first emission, reserve same-size **Void** slots in chunk 0 for Duration + Segment-level SeekHead.
2. On `stop()`: scan clusters for cues; patch Duration + SeekHead (same byte length); append trailing **Cues**.
3. **Long path** (≥ one sealed 5 MiB part): `replace` Part 0, then upload remainder + Cues as final (possibly undersized) part.
4. **Short path** (< 5 MiB, nothing sealed): patch whole object in place, upload media + Cues as one final part.

### Track B — Abrupt close (`pagehide`)

- Keepalive ≈ 64 KB → **no** multi-MB flush / Part 0 rewrite from the client.
- **0** ACKed chunks → `abort` (never seal empty “completed”).
- **≥1** ACKed → `finalize({ abrupt: true })` with acknowledged count only.
- Backend may async-repair Duration/SeekHead/Cues and set `seekRepairStatus`.

### Track C — Cue density

Unknown-size EBML Clusters must be bounded at Segment-level sibling IDs. Naive “first cluster = rest of file” yields `cueCount: 1` and broken scrub.

### Local emergency blob

`stop()` / failure paths expose a local blob. Prefer applying the same `repairAbruptWebmSeekability` (or Duration/SeekHead/Cues path) so **upload and local fallback** are both seekable without third-party packages.

---

## 8. State Machine

```
idle → initializing → recording → degraded → backpressured
                                    ↓
                              finalizing → completed | failed | cancelled
```

- `destroy()` tears down media and aborts in-flight upload when appropriate → typically `cancelled`.
- Host binds UI to `onStateChange` / `getState()`; library does not pause product sessions itself.

---

## 9. Logging

`ChunkRecorderOptions.debug`:

- omitted → **silent** (no console noise)
- `true` → library routes to `console.info` / `warn` / `error`
- function `(level, context, data?) => void` → consumer pipes to Sentry/Datadog/etc.

---

## 10. Known Limits

- Auto-finalize on unload is best-effort; buffered unacked bytes are lost.
- Zero ACKed chunks ⇒ no video on abrupt leave.
- Reference abrupt repair may skip very large objects (e.g. ~64 MiB Worker memory) → `seekRepairStatus: skipped`.
- Sustained outage past 50 MiB stops capture (visible gap avoidance by design).
- Unsupported WebM browsers get no chunking benefit from this library.

---

## 11. Package Layout (Phase 1)

```
.
├── src/                 # zero-dependency core
│   ├── ChunkRecorder.ts
│   ├── types.ts
│   ├── errors.ts
│   └── internal/        # compositor, audioMixer, chunkQueue, webmSeekRepair, …
├── adapters/            # HTTP clients only — not mixed into internal/
│   ├── http-base.ts
│   ├── r2/
│   └── s3/
├── test/
├── examples/
└── docs/                # this suite
```

Runtime `dependencies` for the published package: **empty**. Adapters use global `fetch`.

---

## 12. Versioning

- SemVer; first publish is **`0.1.0`**
- Retest consumers on `^0.1.0`; ship **`1.0.0` only when the public API is intentionally stable**
- Manual `@changesets/cli` (Option A): author a changeset before release; no publish CI in Phase 1
