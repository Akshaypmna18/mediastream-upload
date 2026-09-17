import {
  ChunkRecorderError,
  FinalizeError,
  SourceInitializationError,
  UnsupportedBrowserError,
} from "./errors";
import { createAudioMixer } from "./internal/audioMixer";
import { ChunkQueue } from "./internal/chunkQueue";
import { Compositor, DEFAULT_COMPOSITOR_OPTIONS } from "./internal/compositor";
import {
  getPreferredMimeType,
  isFeatureSupported,
} from "./internal/mimeSupport";
import {
  buildCuesElement,
  ensureDurationPatchable,
  ensureSeekHeadReservable,
  patchDurationSameSize,
  patchSeekHeadCuesSameSize,
  repairAbruptWebmSeekability,
  SEEKHEAD_RESERVE_BYTES,
  scanBlobsForSeekMetadata,
} from "./internal/webmSeekRepair";
import type {
  ChunkRecorderBackend,
  ChunkRecorderOptions,
  ChunkRecorderStartArgs,
  ChunkRecorderState,
  ChunkRecorderStopResult,
  LogHandler,
} from "./types";
import { resolveLogger } from "./types";

const DEFAULT_VIDEO_BPS = 2_500_000;
const DEFAULT_AUDIO_BPS = 128_000;

/**
 * Headless composite recorder + incremental chunk upload.
 *
 * @example
 * ```ts
 * const recorder = new ChunkRecorder({ onStateChange: console.log });
 * await recorder.start({
 *   sources: { main: cameraStream },
 *   backend: createR2Backend("https://uploads.example.com"),
 * });
 * const { videoUrl, localBlob } = await recorder.stop();
 * ```
 */
export class ChunkRecorder {
  private state: ChunkRecorderState = "idle";
  private readonly onStateChange?: (state: ChunkRecorderState) => void;
  private readonly log: LogHandler;

  private backend: ChunkRecorderBackend | null = null;
  private uploadId: string | null = null;
  private mimeType = "video/webm";

  private queue: ChunkQueue | null = null;
  private compositor: Compositor | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private combinedStream: MediaStream | null = null;

  private startTimeMs: number | null = null;
  private stopTimeMs: number | null = null;
  private emergencyBlob: Blob | null = null;
  private explicitFinalized = false;
  private pageHideHandler: (() => void) | null = null;

  /**
   * @param options - Optional state listener and pluggable `debug` logger
   */
  constructor(options: ChunkRecorderOptions = {}) {
    this.onStateChange = options.onStateChange;
    this.log = resolveLogger(options.debug);
  }

  /** Current lifecycle state. */
  getState(): ChunkRecorderState {
    return this.state;
  }

  /**
   * Composited blob-so-far after mid-session failure (may be null).
   */
  getEmergencyBlob(): Blob | null {
    return this.emergencyBlob;
  }

  /**
   * Begin compositing, recording, and incremental upload.
   *
   * Must be called from a user-gesture context so `AudioContext` can resume.
   *
   * @param args - Sources, backend, and optional canvas/bitrate overrides
   * @throws {UnsupportedBrowserError} when WebM capture is unavailable
   * @throws {SourceInitializationError} when audio/video pipeline cannot start
   * @throws {ChunkRecorderError} when started from an invalid state
   */
  async start(args: ChunkRecorderStartArgs): Promise<void> {
    if (
      this.state !== "idle" &&
      this.state !== "completed" &&
      this.state !== "failed" &&
      this.state !== "cancelled"
    ) {
      throw new ChunkRecorderError(
        `Cannot start from state "${this.state}"`,
        "invalid_state",
      );
    }

    this.setState("initializing");
    this.backend = args.backend;
    this.uploadId = null;
    this.emergencyBlob = null;
    this.explicitFinalized = false;
    this.startTimeMs = null;
    this.stopTimeMs = null;

    const fps = args.fps ?? DEFAULT_COMPOSITOR_OPTIONS.fps;
    const videoBitsPerSecond = args.videoBitsPerSecond ?? DEFAULT_VIDEO_BPS;
    const audioBitsPerSecond = args.audioBitsPerSecond ?? DEFAULT_AUDIO_BPS;

    try {
      if (!isFeatureSupported()) {
        throw new UnsupportedBrowserError();
      }

      const { uploadId } = await args.backend.init({
        contentType: "video/webm",
        ...(args.metadata ?? {}),
      });
      this.uploadId = uploadId;

      this.compositor = new Compositor({
        canvasWidth: args.canvasWidth,
        canvasHeight: args.canvasHeight,
        pipWidth: args.pipWidth,
        pipHeight: args.pipHeight,
        pipMargin: args.pipMargin,
        pipPosition: args.pipPosition,
        fps,
        log: this.log,
        onError: (error) => this.handleInternalError(error, "compositor"),
      });

      const handles = this.compositor.start(
        args.sources.main,
        args.sources.pip,
      );

      const mixer = await createAudioMixer(
        args.sources.main,
        args.sources.pip,
        {
          fps,
          log: this.log,
          playbackToSpeakers: args.playbackToSpeakers,
        },
      );
      this.audioContext = mixer.audioContext;

      const videoTracks = handles.canvasStream.getVideoTracks();
      if (videoTracks.length === 0 || mixer.audioTracks.length === 0) {
        throw new SourceInitializationError(
          "Failed to build combined MediaStream",
        );
      }

      const combinedStream = new MediaStream([
        ...videoTracks,
        ...mixer.audioTracks,
      ]);
      this.combinedStream = combinedStream;

      const mimeType = getPreferredMimeType();
      this.mimeType = mimeType || "video/webm";

      this.queue = new ChunkQueue({
        mimeType: this.mimeType,
        log: this.log,
        sendChunk: (sequenceNumber, checksum, bytes, options) => {
          if (!this.backend || !this.uploadId) {
            return Promise.reject(
              new ChunkRecorderError(
                "Upload not initialized",
                "not_initialized",
              ),
            );
          }
          return this.backend.sendChunk(
            this.uploadId,
            sequenceNumber,
            checksum,
            bytes,
            options,
          );
        },
        onBufferState: (bufferState) => {
          if (
            this.state === "recording" ||
            this.state === "degraded" ||
            this.state === "backpressured"
          ) {
            this.setState(bufferState);
          }
        },
        onCaptureGate: (stopped) => {
          if (stopped) {
            this.compositor?.stopCapture();
            try {
              if (this.mediaRecorder?.state === "recording") {
                this.mediaRecorder.pause();
              }
            } catch {
              // ignore
            }
          } else {
            this.compositor?.resumeCapture();
            try {
              if (this.mediaRecorder?.state === "paused") {
                this.mediaRecorder.resume();
              }
            } catch {
              // ignore
            }
          }
        },
        transformFirstBlob: (blob) => this.reserveChunk0Headers(blob),
      });

      const recorderOptions: MediaRecorderOptions = mimeType
        ? {
            mimeType,
            videoBitsPerSecond,
            audioBitsPerSecond,
          }
        : { videoBitsPerSecond, audioBitsPerSecond };

      const recorder = new MediaRecorder(combinedStream, recorderOptions);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.queue?.pushRecorderBlob(event.data);
      };
      recorder.onstart = () => {
        this.startTimeMs = performance.now();
      };
      recorder.onstop = () => {
        this.stopTimeMs = performance.now();
      };
      recorder.onerror = (event) => {
        const message =
          (event as unknown as { error?: DOMException }).error?.message ??
          "MediaRecorder error";
        this.handleInternalError(new Error(message), "mediaRecorder.onerror");
      };

      this.mediaRecorder = recorder;
      recorder.start(1000);

      this.attachPageHideFinalize();
      this.setState("recording");
    } catch (err) {
      this.teardownMedia();
      this.detachPageHideFinalize();
      this.setState("failed");
      throw err;
    }
  }

  /**
   * Stop recording, apply seek patches (Track A), finalize the upload.
   *
   * @returns Remote `videoUrl` and a seek-repaired local blob when possible
   * @throws {FinalizeError} when finalize fails or no chunks were uploaded
   * @throws {Chunk0FatalError} / {@link ChunkUploadError} on upload exhaustion
   */
  async stop(): Promise<ChunkRecorderStopResult> {
    if (
      this.state !== "recording" &&
      this.state !== "degraded" &&
      this.state !== "backpressured"
    ) {
      throw new ChunkRecorderError(
        `Cannot stop from state "${this.state}"`,
        "invalid_state",
      );
    }

    const queue = this.queue;
    if (queue?.getFatalError()) {
      throw queue.getFatalError();
    }

    this.setState("finalizing");
    this.compositor?.stopCapture();
    queue?.setBufferStateActive(false);
    this.detachPageHideFinalize();

    const recorder = this.mediaRecorder;
    if (!recorder || recorder.state === "inactive") {
      this.teardownMedia();
      this.setState("failed");
      throw new FinalizeError("MediaRecorder inactive on stop");
    }

    await new Promise<void>((resolve) => {
      const onStop = () => {
        recorder.removeEventListener("stop", onStop);
        resolve();
      };
      recorder.addEventListener("stop", onStop);
      if (recorder.state === "recording" || recorder.state === "paused") {
        try {
          recorder.requestData();
        } catch {
          // ignore
        }
        recorder.stop();
      } else {
        resolve();
      }
    });

    this.stopTimeMs = performance.now();

    if (!queue || !this.backend || !this.uploadId) {
      this.teardownMedia();
      this.setState("failed");
      throw new FinalizeError("Missing queue/backend/uploadId on finalize");
    }

    await queue.drainRecordPump();
    queue.sealBatch(true);
    await queue.flushUploads();

    const durationMs = Math.max(
      0,
      (this.stopTimeMs ?? performance.now()) -
        (this.startTimeMs ?? performance.now()),
    );

    await this.applySeekabilityAndUpload(queue, durationMs);

    if (queue.getFatalError()) {
      this.teardownMedia();
      throw queue.getFatalError();
    }

    if (queue.getAcknowledgedChunks() < 1) {
      this.teardownMedia();
      this.setState("failed");
      throw new FinalizeError("No chunks were uploaded");
    }

    let videoUrl: string;
    try {
      const result = await this.backend.finalize(
        this.uploadId,
        queue.getAcknowledgedChunks(),
      );
      videoUrl = result.videoUrl;
      this.explicitFinalized = true;
    } catch (err) {
      this.emergencyBlob = this.buildLocalBlob(queue);
      try {
        await this.backend.abort(this.uploadId, "finalize_failed");
      } catch {
        // ignore
      }
      this.teardownMedia();
      this.setState("failed");
      throw new FinalizeError(
        err instanceof Error ? err.message : "finalize failed",
        { cause: err instanceof Error ? err : undefined },
      );
    }

    let localBlob = this.buildLocalBlob(queue);
    if (localBlob && this.mimeType.includes("webm")) {
      try {
        const repaired = repairAbruptWebmSeekability(
          new Uint8Array(await localBlob.arrayBuffer()),
          { durationMs },
        );
        if (repaired.ok) {
          localBlob = new Blob([repaired.bytes as BlobPart], {
            type: this.mimeType,
          });
        }
      } catch (err) {
        this.log("warn", "localBlob.seekRepair", err);
      }
    }

    this.teardownMedia();
    this.setState("completed");
    return { videoUrl, localBlob };
  }

  /**
   * Tear down without waiting for finalize (e.g. host unmount).
   * Aborts staged upload when possible and moves to `cancelled`.
   */
  destroy(): void {
    this.detachPageHideFinalize();
    this.compositor?.stopCapture();

    const uploadId = this.uploadId;
    const backend = this.backend;
    const shouldAbort =
      uploadId &&
      backend &&
      !this.explicitFinalized &&
      this.state !== "completed" &&
      this.state !== "idle";

    try {
      const recorder = this.mediaRecorder;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    } catch {
      // Best-effort cleanup.
    }

    this.teardownMedia();

    if (shouldAbort && uploadId && backend) {
      void backend.abort(uploadId, "destroy").catch(() => undefined);
    }

    if (this.state !== "idle") {
      this.setState("cancelled");
    }
  }

  private async reserveChunk0Headers(blob: Blob): Promise<Blob> {
    let bytes: Uint8Array = new Uint8Array(await blob.arrayBuffer());
    const durationReserve = ensureDurationPatchable(bytes);
    if (durationReserve.ok) {
      bytes = durationReserve.bytes;
      this.log("info", "chunk0.durationReserve", {
        reason: durationReserve.reason,
        bytes: bytes.byteLength,
      });
    } else {
      this.log("warn", "chunk0.durationReserveFailed", durationReserve.reason);
    }

    const seekReserve = ensureSeekHeadReservable(bytes);
    if (seekReserve.ok) {
      bytes = seekReserve.bytes;
      this.log("info", "chunk0.seekHeadReserve", {
        reason: seekReserve.reason,
        bytes: bytes.byteLength,
        reserve: SEEKHEAD_RESERVE_BYTES,
      });
    } else {
      this.log("warn", "chunk0.seekHeadReserveFailed", seekReserve.reason);
    }

    return new Blob([bytes as BlobPart], { type: this.mimeType });
  }

  private async applySeekabilityAndUpload(
    queue: ChunkQueue,
    durationMs: number,
  ): Promise<void> {
    try {
      const mediaBlobs = queue.getMediaBlobs();
      const scan = await scanBlobsForSeekMetadata(mediaBlobs);
      const mediaBytes = mediaBlobs.reduce((sum, b) => sum + b.size, 0);
      const cuesBytes = buildCuesElement(scan.cues);
      const cuesPosition = Math.max(0, mediaBytes - scan.segmentPayloadOffset);
      const part0 = queue.getPart0Blob();
      const finalizePath = part0 ? "long" : "short";

      this.log("info", "seek.metadata", {
        durationMs,
        mediaBytes,
        cueCount: scan.cues.length,
        cuesBytes: cuesBytes.byteLength,
        cuesPosition,
        timecodeScale: scan.timecodeScale,
        path: finalizePath,
      });

      if (scan.cues.length <= 1 && durationMs > 5_000) {
        this.log("warn", "seek.lowCueCount", {
          cueCount: scan.cues.length,
          durationMs,
          mediaBytes,
        });
      }

      const applySeekPatches = async (
        source: Uint8Array,
        label: string,
      ): Promise<Uint8Array> => {
        const originalLen = source.byteLength;
        let out = source;

        const patchedDuration = patchDurationSameSize(
          out,
          durationMs,
          scan.timecodeScale,
        );
        if (patchedDuration && patchedDuration.byteLength === originalLen) {
          out = patchedDuration;
          this.log("info", "seek.durationPatched", { label, durationMs });
        } else {
          this.log("warn", "seek.durationPatchSkipped", { label });
        }

        const patchedSeek = patchSeekHeadCuesSameSize(out, cuesPosition);
        if (patchedSeek && patchedSeek.byteLength === originalLen) {
          out = patchedSeek;
          this.log("info", "seek.seekHeadPatched", {
            label,
            cuesPosition,
            cueCount: scan.cues.length,
          });
        } else {
          this.log("warn", "seek.seekHeadPatchSkipped", { label });
        }

        return out;
      };

      if (part0) {
        const part0Bytes = await applySeekPatches(
          new Uint8Array(await part0.arrayBuffer()),
          "Part 0",
        );
        queue.enqueueReplace(
          new Blob([part0Bytes as BlobPart], { type: this.mimeType }),
        );
        await queue.flushUploads();

        const remainder = queue.getBatchRemainder();
        queue.clearBatchRemainder();

        const trailingParts: BlobPart[] = [];
        if (remainder && remainder.size > 0) trailingParts.push(remainder);
        trailingParts.push(cuesBytes as BlobPart);
        const trailing = new Blob(trailingParts, { type: this.mimeType });
        if (trailing.size > 0) {
          queue.enqueueFinal(trailing);
          await queue.flushUploads();
        }
      } else {
        const remainder =
          queue.getBatchRemainder() ?? this.buildLocalBlob(queue);
        queue.clearBatchRemainder();

        if (!remainder || remainder.size <= 0) {
          throw new FinalizeError("No media bytes available to finalize");
        }

        this.log("info", "seek.shortPath", {
          mediaBytes: remainder.size,
          cuesPosition,
        });

        const patchedMedia = await applySeekPatches(
          new Uint8Array(await remainder.arrayBuffer()),
          "short object",
        );

        const trailing = new Blob(
          [patchedMedia as BlobPart, cuesBytes as BlobPart],
          {
            type: this.mimeType,
          },
        );
        queue.enqueueFinal(trailing);
        await queue.flushUploads();
      }
    } catch (err) {
      this.log("warn", "seek.patchFailed", err);
      const remainder = queue.getBatchRemainder();
      if (remainder && remainder.size > 0) {
        queue.clearBatchRemainder();
        queue.enqueueFinal(remainder);
        await queue.flushUploads();
      }
    }
  }

  private buildLocalBlob(queue: ChunkQueue | null = this.queue): Blob | null {
    const blobs = queue?.getMediaBlobs() ?? [];
    if (blobs.length === 0) return null;
    return new Blob(blobs, { type: this.mimeType });
  }

  private setState(next: ChunkRecorderState): void {
    if (this.state === next) return;
    this.state = next;
    this.onStateChange?.(next);
  }

  private handleInternalError(err: unknown, context: string): void {
    if (this.queue?.getFatalError()) return;
    const error =
      err instanceof Error ? err : new Error(`ChunkRecorder: ${context} error`);
    this.log("error", context, error);
    this.emergencyBlob = this.buildLocalBlob();
    this.compositor?.stopCapture();

    const uploadId = this.uploadId;
    const backend = this.backend;
    if (uploadId && backend) {
      void backend
        .abort(uploadId, `internal_error_${context}`)
        .catch(() => undefined);
    }

    this.setState("failed");
  }

  private attachPageHideFinalize(): void {
    this.detachPageHideFinalize();
    this.pageHideHandler = () => {
      if (this.explicitFinalized || !this.uploadId || !this.backend) return;
      const totalChunks = this.queue?.getAcknowledgedChunks() ?? 0;
      const uploadId = this.uploadId;
      const backend = this.backend;
      if (totalChunks < 1) {
        void backend
          .abort(uploadId, "pagehide_no_chunks")
          .catch(() => undefined);
        return;
      }
      void this.keepaliveFinalize(totalChunks);
    };
    window.addEventListener("pagehide", this.pageHideHandler);
  }

  private async keepaliveFinalize(totalChunks: number): Promise<void> {
    if (!this.backend || !this.uploadId || this.explicitFinalized) return;
    try {
      await this.backend.finalize(this.uploadId, totalChunks, {
        abrupt: true,
      });
      this.explicitFinalized = true;
    } catch {
      // Spec: best-effort, not a hard guarantee.
    }
  }

  private detachPageHideFinalize(): void {
    if (!this.pageHideHandler) return;
    window.removeEventListener("pagehide", this.pageHideHandler);
    this.pageHideHandler = null;
  }

  private teardownMedia(): void {
    this.queue?.setBufferStateActive(false);

    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
      }
    } catch {
      // ignore
    }
    this.mediaRecorder = null;

    this.compositor?.destroy();
    this.compositor = null;

    this.combinedStream?.getTracks?.().forEach((track) => {
      track.stop();
    });
    this.combinedStream = null;

    void this.audioContext?.close();
    this.audioContext = null;
  }
}
