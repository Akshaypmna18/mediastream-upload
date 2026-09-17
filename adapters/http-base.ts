import type { ChunkRecorderBackend, SeekRepairStatus } from "../src/types";

/**
 * HTTP client error from a chunk-upload backend adapter.
 */
export class HttpBackendError extends Error {
  readonly status: number;
  readonly operation: string;

  constructor(operation: string, status: number, detail?: string) {
    const suffix = detail ? `: ${detail}` : "";
    super(`${operation} failed (${status})${suffix}`);
    this.name = "HttpBackendError";
    this.operation = operation;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type CreateHttpBackendOptions = {
  /**
   * Optional `fetch` implementation (defaults to global `fetch`).
   * Useful for tests and non-browser runtimes.
   */
  fetch?: typeof fetch;
};

async function readErrorBody(response: Response): Promise<string> {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

/**
 * Shared HTTP wire client matching the documented backend contract.
 *
 * Endpoints:
 * - `POST /uploads`
 * - `PUT /uploads/{uploadId}/chunks/{sequenceNumber}`
 * - `POST /uploads/{uploadId}/finalize`
 * - `POST /uploads/{uploadId}/abort`
 *
 * Cloudflare Worker/R2 and PHP/S3 reference servers use this same shape.
 *
 * @param baseUrl - API origin (trailing slash stripped)
 * @param options - Optional custom `fetch`
 * @returns {@link ChunkRecorderBackend}
 *
 * @example
 * ```ts
 * const backend = createHttpBackend("https://uploads.example.com");
 * await recorder.start({ sources, backend });
 * ```
 */
export function createHttpBackend(
  baseUrl: string,
  options: CreateHttpBackendOptions = {},
): ChunkRecorderBackend {
  const root = baseUrl.replace(/\/$/, "");
  const fetchFn = options.fetch ?? fetch;

  return {
    async init(metadata) {
      const response = await fetchFn(`${root}/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata ?? {}),
      });
      if (!response.ok) {
        throw new HttpBackendError(
          "init",
          response.status,
          await readErrorBody(response),
        );
      }
      const data = (await response.json()) as { uploadId?: string };
      if (!data.uploadId) {
        throw new HttpBackendError("init", response.status, "missing uploadId");
      }
      return { uploadId: data.uploadId };
    },

    async sendChunk(uploadId, sequenceNumber, checksum, bytes, sendOptions) {
      const replace = sendOptions?.replace === true;
      const url = new URL(
        `${root}/uploads/${encodeURIComponent(uploadId)}/chunks/${sequenceNumber}`,
      );
      if (replace) url.searchParams.set("replace", "1");

      const response = await fetchFn(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Checksum-SHA256": checksum,
          ...(replace ? { "X-Replace-Part": "1" } : {}),
        },
        body: bytes,
      });
      if (!response.ok) {
        throw new HttpBackendError(
          `sendChunk(${sequenceNumber})`,
          response.status,
          await readErrorBody(response),
        );
      }
    },

    async finalize(uploadId, totalChunks, finalizeOptions) {
      const response = await fetchFn(
        `${root}/uploads/${encodeURIComponent(uploadId)}/finalize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalChunks,
            ...(finalizeOptions?.abrupt ? { abrupt: true } : {}),
          }),
          keepalive: true,
        },
      );
      if (!response.ok) {
        throw new HttpBackendError(
          "finalize",
          response.status,
          await readErrorBody(response),
        );
      }
      const data = (await response.json()) as {
        videoUrl?: string;
        abrupt?: boolean;
        seekRepairStatus?: SeekRepairStatus;
      };
      if (!data.videoUrl) {
        throw new HttpBackendError(
          "finalize",
          response.status,
          "missing videoUrl",
        );
      }
      return {
        videoUrl: data.videoUrl,
        ...(data.abrupt !== undefined ? { abrupt: data.abrupt } : {}),
        ...(data.seekRepairStatus !== undefined
          ? { seekRepairStatus: data.seekRepairStatus }
          : {}),
      };
    },

    async abort(uploadId, reason) {
      const response = await fetchFn(
        `${root}/uploads/${encodeURIComponent(uploadId)}/abort`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
          keepalive: true,
        },
      );
      if (!response.ok && response.status !== 404) {
        throw new HttpBackendError(
          "abort",
          response.status,
          await readErrorBody(response),
        );
      }
    },
  };
}
