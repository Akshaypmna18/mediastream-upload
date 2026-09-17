# Examples

Runnable demos for **`mediastream-upload`**.

## Prerequisites

```bash
pnpm install
pnpm build
```

Use **localhost** or HTTPS — `getUserMedia` is blocked on insecure origins.

## vanilla-js

Plain HTML + ES modules. No framework.

```bash
pnpm dlx serve .
# → http://localhost:3000/examples/vanilla-js/
```

| Mode | How |
|------|-----|
| **Mock backend** (default) | Chunks stay in memory; `finalize` returns a `blob:` URL you can play in-page |
| **Live backend** | `?backend=https://your-api.example.com` (R2 Worker or S3-shaped PHP API) |

Controls: Start / Stop / Destroy. Status line shows `ChunkRecorder` state.

See [vanilla-js/](./vanilla-js/).

## react

Vite + React. Local `useChunkRecorderDemo` hook wraps the headless class API —
**not** a published React package.

```bash
pnpm example:react
# → http://localhost:5173
```

Same mock / `?backend=` modes as vanilla. See [react/](./react/).
