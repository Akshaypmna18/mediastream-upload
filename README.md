# mediastream-upload

[![npm version](https://img.shields.io/npm/v/mediastream-upload.svg)](https://www.npmjs.com/package/mediastream-upload)
[![bundle size](https://img.shields.io/bundlephobia/minzip/mediastream-upload)](https://bundlephobia.com/package/mediastream-upload)

Composite live browser `MediaStream`s and upload them as **seekable WebM chunks during the session** — not one giant blob at the end.

```text
Traditional:  [==== 10m Recording ====] ---> [== 45s Upload ==] ---> Done
With Library: [==== 10m Rec + Live Chunks ====] -> [0.5s Finalize] -> Done
```

[Website](https://akshaypmna18.github.io/mediastream-upload/) · [npm](https://www.npmjs.com/package/mediastream-upload) · [Live demo](https://akshaypmna18.github.io/mediastream-upload/examples/react) · **0 dependencies** · **Backend-agnostic**

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

Call `start()` from a **user gesture**. Full guide: [Website → Guide](https://akshaypmna18.github.io/mediastream-upload/guide) · repo [docs/getting-started.md](./docs/getting-started.md).

## Docs

Prefer the **[documentation site](https://akshaypmna18.github.io/mediastream-upload/)** (guide, API, backend, live demo). Repo mirrors:

| Doc | Purpose |
|-----|---------|
| [Getting started](./docs/getting-started.md) | Camera, PiP, errors |
| [Architecture](./docs/architecture.md) | Why / how |
| [API](./docs/api-reference.md) | Public surface |
| [Backend contract](./docs/backend-contract.md) | Integrator spec |
| [Testing](./docs/TESTING.md) | What CI proves |

Local demos: [vanilla-js](./examples/vanilla-js/) · [react](./examples/react/) · [sample backend](./examples/backend/).

## Develop

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm example:website   # docs site locally
```

**Current release is `1.0.0`** — public API is stable. Use SemVer for breaking changes.

## License

MIT
