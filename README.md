# mediastream-upload

[![npm version](https://img.shields.io/npm/v/mediastream-upload.svg)](https://www.npmjs.com/package/mediastream-upload)
[![bundle size](https://img.shields.io/bundlephobia/minzip/mediastream-upload)](https://bundlephobia.com/package/mediastream-upload)

Composite live browser `MediaStream`s and upload them as **seekable WebM chunks during the session** — not one giant blob at the end.

```text
Traditional:  [==== 10m Recording ====] ---> [== 45s Upload ==] ---> Done
With Library: [==== 10m Rec + Live Chunks ====] -> [0.5s Finalize] -> Done
```

[npm](https://www.npmjs.com/package/mediastream-upload) · [Docs](./docs/getting-started.md) · [Examples](./examples/) · **0 dependencies** · **Backend-agnostic**

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

Demo: [vanilla-js](./examples/vanilla-js/) · [react](./examples/react/) · [sample backend](./examples/backend/) (`pnpm example:backend`, then `?backend=http://127.0.0.1:8787`).

## Develop

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

First publish is **`0.1.0`**. Ship `1.0.0` only when the public API is intentionally stable.

## License

MIT
