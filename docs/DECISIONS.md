# Locked Decisions

Planning decisions for **`mediastream-upload`**, captured so they are not lost if chat history disappears.

| # | Decision | Choice |
|---|----------|--------|
| 1 | Package name | `mediastream-upload` |
| 2 | Dependencies | `dependencies: {}`; local seek via internal `repairAbruptWebmSeekability` (no `fix-webm-duration`) |
| 3 | Canvas/options | Expose width/height/fps/bitrates with 1280×720@30 defaults |
| 4 | Adapters | Shared `http-base.ts` → `createR2Backend` / `createS3Backend` |
| 5 | Build | tsup (ESM + CJS + `.d.ts`) |
| 6 | Test | vitest + happy-dom; honest browser E2E gaps documented |
| 7 | Lint | biome (self-contained `biome.json`) |
| 8 | Versioning | SemVer; first publish **`0.1.0`**; `1.0.0` only when API is intentionally stable |
| 9 | Logging | `debug?: boolean \| LogHandler`; silent by default |
| 10 | Errors | Typed hierarchy in `src/errors.ts` |
| 11 | Package manager | **pnpm** (lockfile + CI + docs) |
| 12 | Commits | Atomic Conventional Commits per phase |
| 13 | Publish metadata | Public package (`publishConfig.access: public`); no `private: true` |

Repo root = package root.

## Version / publish policy

- First npm release = **`0.1.0`**
- Consumers should retest against `^0.1.0`
- **`1.0.0` only when the public API is intentionally stable**
- Do **not** jump to 1.0.0 on the first registry smoke publish
- Manual `@changesets/cli` (Option A) until publish CI lands

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

- Atomic Conventional Commits per phase (not one giant dump)
- Zero runtime dependencies; native Web APIs only
- Custom typed errors; rich JSDoc on public surface
- No console noise unless `debug` is configured
