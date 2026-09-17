# Examples

Runnable demos for **`mediastream-upload`**.

## Prerequisites

```bash
pnpm install
pnpm build
```

Serve the **package root** (so `/dist` and `/examples` resolve):

```bash
pnpm dlx serve .
```

Then open the example URL printed by `serve` (typically `http://localhost:3000/examples/vanilla-js/`).

Use **localhost** or HTTPS — `getUserMedia` is blocked on insecure origins.

## vanilla-js

Plain HTML + ES modules. No framework.

| Mode | How |
|------|-----|
| **Mock backend** (default) | Chunks stay in memory; `finalize` returns a `blob:` URL you can play in-page |
| **Live backend** | `?backend=https://your-api.example.com` (R2 Worker or S3-shaped PHP API) |

Controls: Start / Stop / Destroy. Status line shows `ChunkRecorder` state.

See [vanilla-js/](./vanilla-js/).
