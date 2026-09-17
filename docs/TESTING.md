# Testing

This package separates **what automated tests can prove** from **what needs a real browser**.

## Automated (vitest + happy-dom)

| Area | Specs | Confidence |
|------|-------|------------|
| EBML seek repair (Duration / SeekHead / Cues, Track C unknown-size clusters) | `test/webmSeekRepair.spec.ts` | High — pure byte logic |
| Chunk batching (5 MiB seal, 15 s non-forcing timer, Part 0 `replace` ack rules) | `test/chunkQueue.spec.ts` | High |
| Retry / backoff + chunk-0 fatal vs mid-chunk failure | `test/chunkQueue.spec.ts` | High (injectable backoff) |
| Buffer pressure → `degraded` / `backpressured` | `test/chunkQueue.spec.ts` | High |
| SHA-256 checksum | `test/checksum.spec.ts` | High |
| MIME preference order / feature gate | `test/mimeSupport.spec.ts` | Medium (APIs mocked) |
| Recorder state machine (start / stop / destroy) | `test/stateMachine.spec.ts` | Medium (`MediaRecorder` / Audio / Worker stubbed) |
| HTTP adapters (URL, headers, keepalive, 404 abort) | `test/adapters/*.spec.ts` | High (`fetch` mocked) |

Run:

```bash
pnpm test
```

## Not meaningfully unit-tested here

These require a real browser (and often a real network / codec stack):

- Actual `MediaRecorder` WebM output and A/V sync
- `canvas.captureStream()` frame quality and Worker-tick timing under tab/OS throttling
- Real `AudioContext` mixing and autoplay-policy edge cases
- End-to-end `pagehide` keepalive finalize / abrupt seek repair against R2 or S3
- HTTP Range scrub of a sealed object in a `<video>` element

**Do not treat green CI as “recording works in Chrome.”** Use the [vanilla example](../examples/vanilla-js/) plus a real backend (or the mock backend for local playback) for smoke checks. Playwright (or similar) is a reasonable stretch goal, not part of v0.1.

## Manual smoke checklist

1. Build: `pnpm build`
2. Serve package root: `pnpm dlx serve .` → open `/examples/vanilla-js/`
3. Allow camera/mic → **Start** → speak/move → **Stop**
4. Confirm state transitions and that the returned video plays / scrubs (mock backend) or that your Worker/PHP finalize URL does
5. Optional: refresh mid-upload with ≥1 ACKed part and confirm abrupt finalize behavior on your server
