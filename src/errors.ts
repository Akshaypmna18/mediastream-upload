/**
 * Typed domain errors for `mediastream-upload`.
 *
 * Prefer `instanceof` checks over parsing message strings.
 *
 * @example
 * ```ts
 * try {
 *   await recorder.start(args);
 * } catch (err) {
 *   if (err instanceof UnsupportedBrowserError) {
 *     // legacy single-blob fallback
 *   }
 * }
 * ```
 */

/** Base error for all library failures. */
export class ChunkRecorderError extends Error {
  readonly code: string;

  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ChunkRecorderError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** WebM MediaRecorder / canvas.captureStream unavailable. */
export class UnsupportedBrowserError extends ChunkRecorderError {
  constructor(
    message = "MediaRecorder video/webm or canvas.captureStream is not supported in this browser",
    options?: ErrorOptions,
  ) {
    super(message, "unsupported_browser", options);
    this.name = "UnsupportedBrowserError";
  }
}

/** Invalid source, missing MediaStream audio, or AudioContext mix failure. */
export class SourceInitializationError extends ChunkRecorderError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, "source_initialization", options);
    this.name = "SourceInitializationError";
  }
}

/** Sequence 0 exhausted retries — upload is unusable without the EBML header. */
export class Chunk0FatalError extends ChunkRecorderError {
  constructor(
    message = "Chunk 0 exhausted retries; aborting upload",
    options?: ErrorOptions,
  ) {
    super(message, "chunk_0_fatal", options);
    this.name = "Chunk0FatalError";
  }
}

/**
 * Pending buffer reached the hard cap and capture was paused.
 * Primary signal remains state `backpressured`; this error is optional for hosts
 * that prefer exception-driven handling.
 */
export class BackpressureOverflowError extends ChunkRecorderError {
  constructor(
    message = "Upload buffer reached the 50 MiB backpressure cap; capture paused",
    options?: ErrorOptions,
  ) {
    super(message, "backpressure_overflow", options);
    this.name = "BackpressureOverflowError";
  }
}

/** Finalize failed after chunks were uploaded (or zero chunks sealed). */
export class FinalizeError extends ChunkRecorderError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, "finalize_failed", options);
    this.name = "FinalizeError";
  }
}

/** A non-zero chunk exhausted retries (upload aborted). */
export class ChunkUploadError extends ChunkRecorderError {
  readonly sequenceNumber: number;

  constructor(
    sequenceNumber: number,
    message?: string,
    options?: ErrorOptions,
  ) {
    super(
      message ?? `Chunk ${sequenceNumber} exhausted retries`,
      "chunk_upload_failed",
      options,
    );
    this.name = "ChunkUploadError";
    this.sequenceNumber = sequenceNumber;
  }
}
