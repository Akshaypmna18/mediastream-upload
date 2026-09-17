# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-16

### Added

- `pipPosition` start option (`top-left` \| `top-right` \| `bottom-left` \| `bottom-right`; default `top-left`)
- Package scaffold (`tsup`, `vitest`, `biome`, Changesets)
- Architecture and API documentation under `docs/`
- Zero-dependency EBML seek-repair engine (`src/internal/webmSeekRepair.ts`) with unit tests
- Typed errors, compositor, audio mixer, chunk queue, checksum, and MIME helpers
- `ChunkRecorder` orchestrator (seekable finalize, pagehide, pluggable debug)
- HTTP adapters: `createR2Backend` / `createS3Backend` (shared wire protocol)
- OSS README, TESTING.md, and vanilla JS example
