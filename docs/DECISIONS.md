# Locked Decisions

Planning decisions for **`mediastream-upload`**.

| # | Decision | Choice |
|---|----------|--------|
| 1 | Package name | `mediastream-upload` |
| 2 | Dependencies | `dependencies: {}`; local seek via internal `repairAbruptWebmSeekability` (no `fix-webm-duration`) |
| 3 | Canvas/options | Expose width/height/fps/bitrates with 1280×720@30 defaults |
| 4 | Adapters | Shared `http-base.ts` → `createR2Backend` / `createS3Backend` |
| 5 | Build | tsup (ESM + CJS + `.d.ts`) |
| 6 | Test | vitest + happy-dom; honest browser E2E gaps documented |
| 7 | Lint | biome (self-contained `biome.json`) |
| 8 | Versioning | SemVer; **`1.0.0` = stable public API** |
| 9 | Logging | `debug?: boolean \| LogHandler`; silent by default |
| 10 | Errors | Typed hierarchy in `src/errors.ts` |
| 11 | Package manager | **pnpm** (lockfile + CI + docs) |
| 12 | Commits | Atomic Conventional Commits |
| 13 | Publish metadata | Public package (`publishConfig.access: public`) |
| 14 | Docs UX | GitHub Pages site is the primary front door; repo `docs/` remain source mirrors |

Repo root = package root. Site: https://akshaypmna18.github.io/mediastream-upload/

## Version / publish policy

- **`1.0.0`** — public API intentionally stable
- Breaking changes require a new major
- Manual `@changesets/cli` until publish CI lands

## Acceptance

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

- Dist exports smoke: `ChunkRecorder`, errors, seek helpers, `createR2Backend` / `createS3Backend`
- `dependencies: {}`, entry points `.` + `./adapters/r2` + `./adapters/s3`

## Senior engineering standards

- Atomic Conventional Commits (not one giant dump)
- Zero runtime dependencies; native Web APIs only
- Custom typed errors; rich JSDoc on public surface
- No console noise unless `debug` is configured
