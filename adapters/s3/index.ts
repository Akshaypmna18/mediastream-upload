import type { ChunkRecorderBackend } from "../../src/types";
import { type CreateHttpBackendOptions, createHttpBackend } from "../http-base";

export { HttpBackendError } from "../http-base";
export type { ChunkRecorderBackend, CreateHttpBackendOptions };

/**
 * HTTP backend adapter for PHP + AWS S3-shaped APIs.
 *
 * Wire protocol is identical to {@link createR2Backend}; point `baseUrl` at
 * your API that implements the documented `/uploads` contract (see
 * `docs/backend-contract.md`).
 *
 * @param baseUrl - API origin (e.g. `https://api.example.com/api/v1`)
 * @param options - Optional custom `fetch`
 * @returns {@link ChunkRecorderBackend}
 *
 * @example
 * ```ts
 * import { createS3Backend } from "mediastream-upload/adapters/s3";
 * import { ChunkRecorder } from "mediastream-upload";
 *
 * const recorder = new ChunkRecorder();
 * await recorder.start({
 *   sources: { main: stream },
 *   backend: createS3Backend("https://api.example.com/api/v1"),
 * });
 * ```
 */
export function createS3Backend(
  baseUrl: string,
  options?: CreateHttpBackendOptions,
): ChunkRecorderBackend {
  return createHttpBackend(baseUrl, options);
}
