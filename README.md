# mediastream-upload

Composite live browser `MediaStream`s and upload them as **seekable WebM chunks during the session** — not one giant blob at the end.

Zero runtime dependencies. Backend-agnostic (`init` / `sendChunk` / `finalize` / `abort`). R2 and S3 HTTP adapters included.

## Install

```bash
pnpm add mediastream-upload
```

## Quick start

```ts
import { ChunkRecorder } from "mediastream-upload";
import { createR2Backend } from "mediastream-upload/adapters/r2";

const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
const recorder = new ChunkRecorder({ onStateChange: console.log });

await recorder.start({
  sources: { main: stream },
  backend: createR2Backend("https://your-worker.example.com"),
});

const { videoUrl, localBlob } = await recorder.stop();
```

Call `start()` from a **user gesture**. Details: [docs/getting-started.md](./docs/getting-started.md).

## Docs

| Doc | Purpose |
|-----|---------|
| [Getting started](./docs/getting-started.md) | Camera, PiP, errors |
| [Architecture](./docs/architecture.md) | Why / how |
| [API](./docs/api-reference.md) | Public surface |
| [Backend contract](./docs/backend-contract.md) | Integrator spec |
| [Testing](./docs/TESTING.md) | What CI proves |

Demo: [examples/vanilla-js](./examples/vanilla-js/) (`pnpm build` → `pnpm dlx serve .`).

## Develop

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

First publish is **`0.1.0`**. Ship `1.0.0` only when the public API is intentionally stable.

## License

MIT
