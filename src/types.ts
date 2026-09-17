/**
 * Shared logging, sources, backend contract, and public option types.
 */

/**
 * Pluggable diagnostic sink. When omitted, the library stays silent.
 *
 * @example
 * ```ts
 * const debug: LogHandler = (level, context, data) => {
 *   myTelemetry.emit({ level, context, data });
 * };
 * ```
 */
export type LogHandler = (
  level: "info" | "warn" | "error",
  context: string,
  data?: unknown,
) => void;

/**
 * Canonical input is {@link MediaStream}. `HTMLVideoElement` is resolved via
 * `srcObject` / `captureStream`.
 */
export type ChunkRecorderSource = MediaStream | HTMLVideoElement;

export type ChunkRecorderSources = {
  /** Primary full-frame source (mandatory). */
  main: ChunkRecorderSource;
  /** Optional picture-in-picture overlay. */
  pip?: ChunkRecorderSource;
};

/**
 * Deterministic recorder lifecycle.
 *
 * `idle → initializing → recording → degraded → backpressured → finalizing → completed | failed | cancelled`
 */
export type ChunkRecorderState =
  | "idle"
  | "initializing"
  | "recording"
  | "degraded"
  | "backpressured"
  | "finalizing"
  | "completed"
  | "failed"
  | "cancelled";

export type SeekRepairStatus =
  | "none"
  | "pending"
  | "done"
  | "failed"
  | "skipped";

/**
 * Backend-agnostic upload contract (four methods).
 *
 * @see docs/backend-contract.md
 */
export type ChunkRecorderBackend = {
  init: (metadata: Record<string, unknown>) => Promise<{ uploadId: string }>;
  sendChunk: (
    uploadId: string,
    sequenceNumber: number,
    checksum: string,
    bytes: Blob,
    options?: { replace?: boolean },
  ) => Promise<void>;
  finalize: (
    uploadId: string,
    totalChunks: number,
    options?: { abrupt?: boolean },
  ) => Promise<{
    videoUrl: string;
    abrupt?: boolean;
    seekRepairStatus?: SeekRepairStatus;
  }>;
  abort: (uploadId: string, reason: string) => Promise<void>;
};

export type ChunkRecorderOptions = {
  onStateChange?: (state: ChunkRecorderState) => void;
  /**
   * Diagnostic logging. Omitted = silent. `true` = console. Function = custom sink.
   */
  debug?: boolean | LogHandler;
};

/**
 * Where the optional PiP overlay is drawn on the canvas.
 * Defaults to `"top-left"`.
 */
export type PipPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type ChunkRecorderStartArgs = {
  sources: ChunkRecorderSources;
  backend: ChunkRecorderBackend;
  metadata?: Record<string, unknown>;
  /**
   * When true, also route main-source audio to speakers (in addition to the
   * recorded mix). Defaults to auto: true for MediaStream mains, false for
   * file-backed HTMLVideoElement.
   */
  playbackToSpeakers?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  fps?: number;
  pipWidth?: number;
  pipHeight?: number;
  pipMargin?: number;
  /** PiP corner. Default `"top-left"`. */
  pipPosition?: PipPosition;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
};

export type ChunkRecorderStopResult = {
  videoUrl: string;
  localBlob: Blob | null;
};

/**
 * Resolve `debug` option into a callable logger (or a no-op).
 */
export function resolveLogger(debug?: boolean | LogHandler): LogHandler {
  if (debug === true) {
    return (level, context, data) => {
      const payload = data === undefined ? "" : data;
      if (level === "error")
        console.error(`[mediastream-upload] ${context}`, payload);
      else if (level === "warn")
        console.warn(`[mediastream-upload] ${context}`, payload);
      else console.info(`[mediastream-upload] ${context}`, payload);
    };
  }
  if (typeof debug === "function") return debug;
  return () => {
    // silent by default
  };
}
