# Test fixtures

Synthetic WebM/EBML buffers for unit tests live as TypeScript builders (not large `.bin` files).

- `minimalWebm.ts` — builds EBML + Segment + Info + Tracks + Clusters (optional unknown-size Clusters for Track C).

These fixtures exercise pure byte parsers/patchers. They do **not** prove real `MediaRecorder` output; that requires a browser.
