import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Chunk0FatalError, ChunkUploadError } from "../src/errors";
import {
  BACKPRESSURE_BYTES,
  BATCH_MAX_MS,
  backoffMs,
  ChunkQueue,
  DEGRADED_BYTES,
  PART_SIZE,
} from "../src/internal/chunkQueue";

function blobOfSize(size: number, fill = 1): Blob {
  return new Blob([new Uint8Array(size).fill(fill)]);
}

describe("backoffMs", () => {
  it("grows exponentially and stays within cap", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(backoffMs(0)).toBe(1000);
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(2)).toBe(4000);
    expect(backoffMs(10)).toBe(10_000);
  });
});

describe("ChunkQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not force-seal undersized batches when the 15s timer fires", async () => {
    const sendChunk = vi.fn().mockResolvedValue(undefined);
    const queue = new ChunkQueue({ sendChunk });

    queue.pushRecorderBlob(blobOfSize(1024));
    await queue.drainRecordPump();
    expect(sendChunk).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(BATCH_MAX_MS + 50);
    expect(sendChunk).not.toHaveBeenCalled();
    expect(queue.getBatchRemainder()?.size).toBe(1024);
  });

  it("seals exact PART_SIZE non-final parts and tracks Part 0", async () => {
    const sendChunk = vi.fn().mockResolvedValue(undefined);
    const queue = new ChunkQueue({ sendChunk });

    queue.pushRecorderBlob(blobOfSize(PART_SIZE + 100));
    await queue.drainRecordPump();
    await queue.flushUploads();

    expect(sendChunk).toHaveBeenCalledTimes(1);
    expect(sendChunk.mock.calls[0]?.[0]).toBe(0);
    expect(queue.getAcknowledgedChunks()).toBe(1);
    expect(queue.getPart0Blob()?.size).toBe(PART_SIZE);
    expect(queue.getBatchRemainder()?.size).toBe(100);
  });

  it("replace does not inflate acknowledgedChunks", async () => {
    const sendChunk = vi.fn().mockResolvedValue(undefined);
    const queue = new ChunkQueue({ sendChunk });

    queue.pushRecorderBlob(blobOfSize(PART_SIZE));
    await queue.drainRecordPump();
    await queue.flushUploads();
    expect(queue.getAcknowledgedChunks()).toBe(1);

    queue.enqueueReplace(blobOfSize(PART_SIZE, 9));
    await queue.flushUploads();

    expect(queue.getAcknowledgedChunks()).toBe(1);
    expect(sendChunk).toHaveBeenCalledTimes(2);
    expect(sendChunk.mock.calls[1]?.[3]).toEqual({ replace: true });
  });

  it("retries with backoff then succeeds", async () => {
    const sendChunk = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(undefined);
    const queue = new ChunkQueue({
      sendChunk,
      backoffMsFn: () => 0,
    });

    queue.enqueueFinal(blobOfSize(16));
    await queue.flushUploads();

    expect(sendChunk).toHaveBeenCalledTimes(2);
    expect(queue.getAcknowledgedChunks()).toBe(1);
  });

  it("throws Chunk0FatalError when sequence 0 exhausts retries", async () => {
    const sendChunk = vi.fn().mockRejectedValue(new Error("dead"));
    const queue = new ChunkQueue({
      sendChunk,
      backoffMsFn: () => 0,
    });

    queue.enqueueFinal(blobOfSize(16));
    await expect(queue.flushUploads()).rejects.toBeInstanceOf(Chunk0FatalError);
    expect(sendChunk).toHaveBeenCalledTimes(3);
  });

  it("throws ChunkUploadError for non-zero sequence failures", async () => {
    const sendChunk = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error("dead"));
    const queue = new ChunkQueue({
      sendChunk,
      backoffMsFn: () => 0,
    });

    queue.enqueueFinal(blobOfSize(8));
    await queue.flushUploads();

    queue.enqueueFinal(blobOfSize(8, 2));
    await expect(queue.flushUploads()).rejects.toBeInstanceOf(ChunkUploadError);
    expect(sendChunk).toHaveBeenCalledTimes(4); // 1 success + 3 failures
  });

  it("signals degraded then backpressured as pending grows", async () => {
    const states: string[] = [];
    const gates: boolean[] = [];
    const sendChunk = vi.fn().mockImplementation(async () => {
      // Never resolve ack until we inspect buffer states — block the pump.
      await new Promise(() => undefined);
    });

    const queue = new ChunkQueue({
      sendChunk,
      onBufferState: (s) => states.push(s),
      onCaptureGate: (stopped) => gates.push(stopped),
    });

    // Enqueue without waiting for uploads to finish.
    queue.enqueueFinal(blobOfSize(DEGRADED_BYTES));
    expect(states.at(-1)).toBe("degraded");

    queue.enqueueFinal(blobOfSize(BACKPRESSURE_BYTES - DEGRADED_BYTES));
    expect(states.at(-1)).toBe("backpressured");
    expect(gates.at(-1)).toBe(true);
  });
});
