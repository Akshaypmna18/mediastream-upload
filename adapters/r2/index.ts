import type { ChunkRecorderBackend } from "../../src/types";
import { type CreateHttpBackendOptions, createHttpBackend } from "../http-base";

export { HttpBackendError } from "../http-base";
export type { ChunkRecorderBackend, CreateHttpBackendOptions };

/**
 * HTTP backend adapter for Cloudflare Worker + R2-shaped APIs.
 *
 * Wire protocol is identical to {@link createS3Backend}; point `baseUrl` at
 * your Worker origin that implements the documented `/uploads` contract.
 *
 * @param baseUrl - Worker origin (e.g. `https://chunk-upload.example.workers.dev`)
 * @param options - Optional custom `fetch`
 * @returns {@link ChunkRecorderBackend}
 *
 * @example
 * ```ts
 * import { createR2Backend } from "mediastream-upload/adapters/r2";
 * import { ChunkRecorder } from "mediastream-upload";
 *
 * const recorder = new ChunkRecorder();
 * await recorder.start({
 *   sources: { main: stream },
 *   backend: createR2Backend("https://uploads.example.workers.dev"),
 * });
 * ```
 */
export function createR2Backend(
  baseUrl: string,
  options?: CreateHttpBackendOptions,
): ChunkRecorderBackend {
  return createHttpBackend(baseUrl, options);
}
