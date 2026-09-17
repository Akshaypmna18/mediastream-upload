import { Chunk0FatalError, ChunkUploadError } from "../errors";
import type { ChunkRecorderState, LogHandler } from "../types";
import { sha256Hex } from "./checksum";

/** Frozen multipart / backpressure thresholds (architecture §6). */
export const PART_SIZE = 5 * 1024 * 1024;
export const BATCH_MAX_MS = 15_000;
export const DEGRADED_BYTES = 15 * 1024 * 1024;
export const BACKPRESSURE_BYTES = 50 * 1024 * 1024;
export const MAX_CHUNK_ATTEMPTS = 3;
export const BACKOFF_CAP_MS = 10_000;

export type QueuedChunk = {
  sequenceNumber: number;
  blob: Blob;
  replace?: boolean;
};

export type ChunkQueueSendFn = (
  sequenceNumber: number,
  checksum: string,
  bytes: Blob,
  options?: { replace?: boolean },
) => Promise<void>;

export type ChunkQueueOptions = {
  mimeType?: string;
  log?: LogHandler;
  sendChunk: ChunkQueueSendFn;
  /**
   * Invoked when buffer pressure changes the effective recording state
   * among `recording` | `degraded` | `backpressured`.
   */
  onBufferState?: (state: "recording" | "degraded" | "backpressured") => void;
  /** Invoked when capture should pause/resume under backpressure. */
  onCaptureGate?: (stopped: boolean) => void;
  /** Optional async transform applied only to the first recorder blob (header Void reserve). */
  transformFirstBlob?: (blob: Blob) => Promise<Blob>;
  /** Override backoff for tests; defaults to {@link backoffMs}. */
  backoffMsFn?: (attemptIndex: number) => number;
};

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Exponential backoff with jitter.
 *
 * @param attemptIndex - 0-based attempt (0 → ~1s, 1 → ~2s, 2 → ~4s)
 * @returns Delay in ms, capped at {@link BACKOFF_CAP_MS}
 */
export function backoffMs(attemptIndex: number): number {
  const base = Math.min(BACKOFF_CAP_MS, 1000 * 2 ** attemptIndex);
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(BACKOFF_CAP_MS, base + jitter);
}

/**
 * FIFO batcher + upload pump: exact 5 MiB non-final parts, 15s non-forcing timer,
 * maxConcurrency 1, retries, and degraded/backpressured signaling.
 */
export class ChunkQueue {
  private readonly sendChunk: ChunkQueueSendFn;
  private readonly log: LogHandler;
  private readonly onBufferState?: ChunkQueueOptions["onBufferState"];
  private readonly onCaptureGate?: ChunkQueueOptions["onCaptureGate"];
  private readonly transformFirstBlob?: ChunkQueueOptions["transformFirstBlob"];
  private readonly backoffMsFn: (attemptIndex: number) => number;

  private mimeType: string;
  private batchParts: Blob[] = [];
  private batchBytes = 0;
  private batchStartedAt: number | null = null;
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  private uploadQueue: QueuedChunk[] = [];
  private nextSequenceNumber = 0;
  private acknowledgedChunks = 0;
  private uploading = false;
  private uploadPump: Promise<void> = Promise.resolve();
  private recordPump: Promise<void> = Promise.resolve();
  private fatalError: Error | null = null;
  private part0Blob: Blob | null = null;
  private headerReservationApplied = false;
  private bufferState: "recording" | "degraded" | "backpressured" = "recording";
  /** When false, buffer-state callbacks are suppressed (finalizing / terminal). */
  private bufferStateActive = true;
  /** All accepted MediaRecorder blobs (post first-blob transform) for seek scan / local blob. */
  private mediaBlobs: Blob[] = [];

  constructor(options: ChunkQueueOptions) {
    this.sendChunk = options.sendChunk;
    this.log = options.log ?? (() => undefined);
    this.onBufferState = options.onBufferState;
    this.onCaptureGate = options.onCaptureGate;
    this.transformFirstBlob = options.transformFirstBlob;
    this.backoffMsFn = options.backoffMsFn ?? backoffMs;
    this.mimeType = options.mimeType ?? "video/webm";
  }

  setMimeType(mimeType: string): void {
    this.mimeType = mimeType;
  }

  getAcknowledgedChunks(): number {
    return this.acknowledgedChunks;
  }

  getNextSequenceNumber(): number {
    return this.nextSequenceNumber;
  }

  getPart0Blob(): Blob | null {
    return this.part0Blob;
  }

  /** Media blobs in recording order (after optional first-blob transform). */
  getMediaBlobs(): Blob[] {
    return this.mediaBlobs.slice();
  }

  getFatalError(): Error | null {
    return this.fatalError;
  }

  getBufferState(): "recording" | "degraded" | "backpressured" {
    return this.bufferState;
  }

  /** Undersized remainder waiting for more data or stop()+Cues merge. */
  getBatchRemainder(): Blob | null {
    if (this.batchParts.length === 0) return null;
    return new Blob(this.batchParts, { type: this.mimeType });
  }

  clearBatchRemainder(): void {
    this.batchParts = [];
    this.batchBytes = 0;
    this.batchStartedAt = null;
    this.clearBatchTimer();
  }

  /** Pause buffer-state transitions (e.g. while finalizing). */
  setBufferStateActive(active: boolean): void {
    this.bufferStateActive = active;
  }

  reset(): void {
    this.clearBatchTimer();
    this.batchParts = [];
    this.batchBytes = 0;
    this.batchStartedAt = null;
    this.uploadQueue = [];
    this.nextSequenceNumber = 0;
    this.acknowledgedChunks = 0;
    this.uploading = false;
    this.uploadPump = Promise.resolve();
    this.recordPump = Promise.resolve();
    this.fatalError = null;
    this.part0Blob = null;
    this.headerReservationApplied = false;
    this.bufferState = "recording";
    this.bufferStateActive = true;
    this.mediaBlobs = [];
  }

  /**
   * Accept a MediaRecorder timeslice. First blob may be transformed for
   * Duration/SeekHead Void reservation. Processing is serialized.
   */
  pushRecorderBlob(blob: Blob): void {
    if (blob.size <= 0 || this.fatalError) return;
    this.recordPump = this.recordPump
      .then(() => this.processRecorderBlob(blob))
      .catch((err) => {
        this.fatalError =
          err instanceof Error ? err : new Error("recordPump failed");
        this.log("error", "chunkQueue.recordPump", this.fatalError);
      });
  }

  /** Wait until all async first-blob transforms have landed. */
  async drainRecordPump(): Promise<void> {
    await this.recordPump;
  }

  /**
   * Seal buffered bytes into uploadable parts.
   * @param force - On stop: emit full PART_SIZE parts only; leave remainder for Cues merge.
   */
  sealBatch(force: boolean): void {
    if (this.batchParts.length === 0) return;

    if (!force && this.batchBytes < PART_SIZE) {
      this.scheduleBatchTimer();
      return;
    }

    this.clearBatchTimer();
    let combined = new Blob(this.batchParts, { type: this.mimeType });
    this.batchParts = [];
    this.batchBytes = 0;
    this.batchStartedAt = null;

    while (combined.size >= PART_SIZE) {
      const part = combined.slice(0, PART_SIZE, this.mimeType);
      if (this.nextSequenceNumber === 0) {
        this.part0Blob = part;
      }
      this.enqueuePart(part);
      combined = combined.slice(PART_SIZE, combined.size, this.mimeType);
    }

    if (combined.size > 0) {
      this.batchParts = [combined];
      this.batchBytes = combined.size;
      if (!force) {
        this.batchStartedAt = performance.now();
        this.scheduleBatchTimer();
      }
    }

    this.refreshBufferState();
    this.kickUploadPump();
  }

  /** Enqueue Part 0 rewrite (same sequence, does not inflate nextSequenceNumber). */
  enqueueReplace(blob: Blob): void {
    this.enqueuePart(blob, { replace: true });
    this.refreshBufferState();
    this.kickUploadPump();
  }

  /** Enqueue a trailing (possibly undersized) final part. */
  enqueueFinal(blob: Blob): void {
    this.enqueuePart(blob);
    this.refreshBufferState();
    this.kickUploadPump();
  }

  async flushUploads(): Promise<void> {
    this.kickUploadPump();
    await this.uploadPump;
    if (this.fatalError) throw this.fatalError;
  }

  private async processRecorderBlob(blob: Blob): Promise<void> {
    let finalBlob = blob;

    if (!this.headerReservationApplied && this.transformFirstBlob) {
      this.headerReservationApplied = true;
      try {
        finalBlob = await this.transformFirstBlob(blob);
      } catch (err) {
        this.log("warn", "chunkQueue.transformFirstBlob", err);
        finalBlob = blob;
      }
    } else if (!this.headerReservationApplied) {
      this.headerReservationApplied = true;
    }

    if (finalBlob.size <= 0) return;
    this.mediaBlobs.push(finalBlob);
    this.batchParts.push(finalBlob);
    this.batchBytes += finalBlob.size;
    if (this.batchStartedAt == null) {
      this.batchStartedAt = performance.now();
      this.scheduleBatchTimer();
    }
    this.sealBatch(false);
    this.refreshBufferState();
  }

  private enqueuePart(blob: Blob, options?: { replace?: boolean }): void {
    if (blob.size <= 0) return;
    const sequenceNumber =
      options?.replace === true ? 0 : this.nextSequenceNumber;
    if (options?.replace !== true) {
      this.nextSequenceNumber += 1;
    }
    this.uploadQueue.push({
      sequenceNumber,
      blob,
      replace: options?.replace,
    });
  }

  private clearBatchTimer(): void {
    if (this.batchTimer != null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  private scheduleBatchTimer(): void {
    if (this.batchTimer != null || this.batchStartedAt == null) return;
    const elapsed = performance.now() - this.batchStartedAt;
    const remaining = Math.max(0, BATCH_MAX_MS - elapsed);
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      // Never force-seal undersized non-final parts (R2/S3 rule).
      this.sealBatch(false);
    }, remaining);
  }

  private pendingBytes(): number {
    const queued = this.uploadQueue.reduce(
      (sum, item) => sum + item.blob.size,
      0,
    );
    return queued + this.batchBytes;
  }

  private refreshBufferState(): void {
    if (!this.bufferStateActive) return;

    const pending = this.pendingBytes();

    if (pending >= BACKPRESSURE_BYTES) {
      this.onCaptureGate?.(true);
      this.setBufferState("backpressured");
      return;
    }

    if (pending >= DEGRADED_BYTES) {
      if (this.bufferState === "backpressured") {
        this.onCaptureGate?.(false);
      }
      this.setBufferState("degraded");
      return;
    }

    if (
      this.bufferState === "backpressured" ||
      this.bufferState === "degraded"
    ) {
      this.onCaptureGate?.(false);
      this.setBufferState("recording");
    }
  }

  private setBufferState(
    next: "recording" | "degraded" | "backpressured",
  ): void {
    if (this.bufferState === next) return;
    this.bufferState = next;
    this.onBufferState?.(next);
  }

  private kickUploadPump(): void {
    this.uploadPump = this.uploadPump
      .then(() => this.runUploadPump())
      .catch((err) => {
        this.log("error", "chunkQueue.uploadPump", err);
      });
  }

  private async runUploadPump(): Promise<void> {
    if (this.uploading || this.fatalError) return;
    this.uploading = true;

    try {
      while (this.uploadQueue.length > 0 && !this.fatalError) {
        const item = this.uploadQueue[0];
        if (!item) break;

        try {
          await this.sendChunkWithRetry(item);
          this.uploadQueue.shift();
          // Replacing Part 0 must not inflate totalChunks for finalize.
          if (!item.replace) {
            this.acknowledgedChunks += 1;
          }
          this.refreshBufferState();
        } catch (err) {
          const error =
            err instanceof Error ? err : new Error("Chunk upload failed");
          this.fatalError = error;
          break;
        }
      }
    } finally {
      this.uploading = false;
    }
  }

  private async sendChunkWithRetry(item: QueuedChunk): Promise<void> {
    const checksum = await sha256Hex(item.blob);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_CHUNK_ATTEMPTS; attempt += 1) {
      try {
        await this.sendChunk(
          item.sequenceNumber,
          checksum,
          item.blob,
          item.replace ? { replace: true } : undefined,
        );
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("sendChunk failed");
        if (attempt < MAX_CHUNK_ATTEMPTS - 1) {
          await sleep(this.backoffMsFn(attempt));
        }
      }
    }

    if (item.sequenceNumber === 0 && !item.replace) {
      throw new Chunk0FatalError(lastError?.message, { cause: lastError });
    }
    throw new ChunkUploadError(item.sequenceNumber, lastError?.message, {
      cause: lastError ?? undefined,
    });
  }
}

/** Narrow helper for hosts mapping buffer pressure onto full {@link ChunkRecorderState}. */
export function isBufferPressureState(
  state: ChunkRecorderState,
): state is "recording" | "degraded" | "backpressured" {
  return (
    state === "recording" || state === "degraded" || state === "backpressured"
  );
}
