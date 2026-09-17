# Getting Started

Incremental composite recording + chunk upload with **`mediastream-upload`**.

---

## Install

```bash
pnpm add mediastream-upload
```

Peer/runtime: modern browser with WebM `MediaRecorder`, Canvas `captureStream`, Web Audio, and Web Crypto (`crypto.subtle`). Node 18+ `fetch` if you only use adapters in SSR tests (recording itself is browser-only).

---

## Minimal: Camera → R2-shaped Backend

```ts
import { ChunkRecorder, UnsupportedBrowserError } from "mediastream-upload";
import { createR2Backend } from "mediastream-upload/adapters/r2";

const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});

const recorder = new ChunkRecorder({
  onStateChange: (s) => {
    /* update UI */
  },
  // debug: true, // or custom LogHandler
});

try {
  await recorder.start({
    sources: { main: stream },
    backend: createR2Backend("https://your-worker.example.com"),
    // Optional overrides:
    // canvasWidth: 1280,
    // canvasHeight: 720,
    // fps: 30,
  });
} catch (err) {
  if (err instanceof UnsupportedBrowserError) {
    // Fall back to your legacy end-of-session upload
  }
  throw err;
}

// … later, from a user gesture / session end button:
const { videoUrl, localBlob } = await recorder.stop();
```

Call `start()` from a **user gesture** so `AudioContext` can resume.

Interactive demo: [examples/vanilla-js](../examples/vanilla-js/) (see [examples/README.md](../examples/README.md)).
Test coverage honesty: [TESTING.md](./TESTING.md).

---

## Camera + Screen (Main + PiP)

```ts
import { createS3Backend } from "mediastream-upload/adapters/s3";

const camera = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});
const screen = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: true,
});

await recorder.start({
  sources: {
    main: screen, // full frame
    pip: camera, // overlay
  },
  backend: createS3Backend("https://api.example.com"),
  playbackToSpeakers: false, // if your UI already plays audio
  pipPosition: "bottom-right", // optional; default "top-left"
});
```

---

## Wiring Adapters

```ts
import { createR2Backend } from "mediastream-upload/adapters/r2";
import { createS3Backend } from "mediastream-upload/adapters/s3";

// Identical wire protocol — point at your deployed API origin:
createR2Backend("https://chunk-upload.workers.dev");
createS3Backend("https://api.example.com/api/v1");
```

Implement the contract yourself: [backend-contract.md](./backend-contract.md).

Custom backend:

```ts
const backend: ChunkRecorderBackend = {
  async init(metadata) {
    /* POST /uploads */
  },
  async sendChunk(uploadId, seq, checksum, bytes, options) {
    /* PUT …/chunks/… */
  },
  async finalize(uploadId, totalChunks, options) {
    /* POST …/finalize */
  },
  async abort(uploadId, reason) {
    /* POST …/abort */
  },
};
```

---

## Error Handling

```ts
import {
  ChunkRecorder,
  UnsupportedBrowserError,
  SourceInitializationError,
  Chunk0FatalError,
  FinalizeError,
} from "mediastream-upload";

try {
  await recorder.start({ sources, backend });
} catch (err) {
  if (err instanceof UnsupportedBrowserError) {
    // Trigger legacy single-blob UI
  } else if (err instanceof SourceInitializationError) {
    // Camera/mic permissions or invalid source
  }
}

try {
  await recorder.stop();
} catch (err) {
  if (err instanceof Chunk0FatalError) {
    // Unusable without header chunk — offer local recovery if any
  } else if (err instanceof FinalizeError) {
    const blob = recorder.getEmergencyBlob();
    // Offer download / support upload
  }
}
```

---

## Lifecycle Tips

- Prefer explicit `stop()` at natural session end.
- Call `destroy()` on unexpected unmount (cancels / aborts staged upload).
- On `backpressured`, pause your product session if silent gaps are unacceptable.
- Unload finalize is best-effort only — do not rely on it as the happy path.

---

## Next Phase (not in v0.1)

- React hook / Vue composable / Svelte store wrappers
- Automated Changesets publish CI
- Playwright E2E for real `MediaRecorder` behavior

See [architecture.md](./architecture.md) and [api-reference.md](./api-reference.md).
