# Examples

Runnable demos for **`mediastream-upload`**.

## Prerequisites

```bash
pnpm install
pnpm build
```

Use **localhost** or HTTPS — `getUserMedia` is blocked on insecure origins.

## backend (sample API)

Local Express server that implements the [backend contract](../docs/backend-contract.md)
on disk (no Cloudflare / R2 required).

```bash
pnpm example:backend
# → http://127.0.0.1:8787
```

Point the UI demos at it:

```text
?backend=http://127.0.0.1:8787
```

See [backend/](./backend/) for curl smoke tests, what is demo vs production, and
abrupt seek-repair guidance.

## vanilla-js

Plain HTML + ES modules. No framework.

```bash
pnpm dlx serve .
# → http://localhost:3000/examples/vanilla-js/
# live API: …/vanilla-js/?backend=http://127.0.0.1:8787
```

| Mode | How |
|------|-----|
| **Mock backend** (default) | Chunks stay in memory; `finalize` returns a `blob:` URL you can play in-page |
| **Live backend** | `?backend=http://127.0.0.1:8787` (sample) or your Worker/API |

Controls: Start / Stop / Destroy. Status line shows `ChunkRecorder` state.

See [vanilla-js/](./vanilla-js/).

## react

Vite + React. Local `useChunkRecorderDemo` hook wraps the headless class API —
**not** a published React package.

```bash
pnpm example:react
# → http://localhost:5173/?backend=http://127.0.0.1:8787
```

Same mock / `?backend=` modes as vanilla. See [react/](./react/).
