# Documentation site

Static docs + live demo for **mediastream-upload**, deployed to **GitHub Pages**.

URL: https://akshaypmna18.github.io/mediastream-upload/

## Local

```bash
# from repo root (build the library first)
pnpm build
pnpm --dir website dev
# → http://localhost:5174/mediastream-upload/
```

## Build

```bash
pnpm build
pnpm --dir website build
```

Output: `website/dist/` (base path `/mediastream-upload/`).

## Deploy

Push to `main` — workflow `.github/workflows/pages.yml` builds and publishes.
Repo Settings → Pages → Source: **GitHub Actions**.
