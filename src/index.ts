/**
 * Public entry for `mediastream-upload`.
 */

export { ChunkRecorder } from "./ChunkRecorder";
export {
  BackpressureOverflowError,
  Chunk0FatalError,
  ChunkRecorderError,
  ChunkUploadError,
  FinalizeError,
  SourceInitializationError,
  UnsupportedBrowserError,
} from "./errors";
export {
  BACKOFF_CAP_MS,
  BACKPRESSURE_BYTES,
  BATCH_MAX_MS,
  backoffMs,
  DEGRADED_BYTES,
  MAX_CHUNK_ATTEMPTS,
  PART_SIZE,
} from "./internal/chunkQueue";
export type {
  AbruptSeekRepairResult,
  ReserveResult,
  WebmCuePoint,
  WebmScanResult,
} from "./internal/webmSeekRepair";
export {
  buildCuesElement,
  ensureDurationPatchable,
  ensureSeekHeadReservable,
  patchDurationSameSize,
  patchSeekHeadCuesSameSize,
  repairAbruptWebmSeekability,
  SEEKHEAD_RESERVE_BYTES,
  scanBlobsForSeekMetadata,
  scanWebmForSeekMetadata,
} from "./internal/webmSeekRepair";
export type {
  ChunkRecorderBackend,
  ChunkRecorderOptions,
  ChunkRecorderSource,
  ChunkRecorderSources,
  ChunkRecorderStartArgs,
  ChunkRecorderState,
  ChunkRecorderStopResult,
  LogHandler,
  PipPosition,
  SeekRepairStatus,
} from "./types";
export { resolveLogger } from "./types";
