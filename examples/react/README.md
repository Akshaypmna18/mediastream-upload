# React example

Vite + React demo that wraps the **headless** `ChunkRecorder` API in a local hook
(`useChunkRecorderDemo`). This is **not** a published React package — official
`useChunkRecorder` is a future phase.

## Run

From the **repo root**:

```bash
pnpm install
pnpm build
pnpm example:react
```

Or:

```bash
pnpm --dir examples/react dev
```

Open the Vite URL (typically `http://localhost:5173`). Use **localhost** or HTTPS —
`getUserMedia` is blocked on insecure origins.

## Modes

| Mode | How |
|------|-----|
| **Mock backend** (default) | In-memory parts → `blob:` playback URL |
| **Live backend** | `?backend=https://your-api.example.com` → `createR2Backend` |

Controls: Start / Stop / Destroy. Status shows recorder state + backend label.
