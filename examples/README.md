# Examples

Runnable demos for **`mediastream-upload`**.

**Prefer the [documentation site](https://akshaypmna18.github.io/mediastream-upload/)** for a quick tour and [live demo](https://akshaypmna18.github.io/mediastream-upload/examples/react).

## Prerequisites (local)

```bash
pnpm install
pnpm build
```

Use **localhost** or HTTPS — `getUserMedia` is blocked on insecure origins.

## backend (sample API)

```bash
pnpm example:backend
# → http://127.0.0.1:8787
```

Point UI demos at it with `?backend=http://127.0.0.1:8787`. See [backend/](./backend/).

## vanilla-js

```bash
pnpm dlx serve .
# → http://localhost:3000/examples/vanilla-js/
```

See [vanilla-js/](./vanilla-js/).

## react

```bash
pnpm example:react
# → http://localhost:5173
```

See [react/](./react/).
