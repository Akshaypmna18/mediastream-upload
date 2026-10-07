import type { ChunkRecorderBackend } from "mediastream-upload";

/** In-memory backend for the hosted demo — not for production. */
export function createMockBackend(): ChunkRecorderBackend {
  const uploads = new Map<
    string,
    { parts: Map<number, Blob>; maxSeq: number }
  >();

  return {
    async init() {
      const uploadId = crypto.randomUUID();
      uploads.set(uploadId, { parts: new Map(), maxSeq: -1 });
      return { uploadId };
    },

    async sendChunk(uploadId, sequenceNumber, _checksum, bytes, options) {
      const rec = uploads.get(uploadId);
      if (!rec) throw new Error("unknown uploadId");
      rec.parts.set(sequenceNumber, bytes);
      if (!options?.replace) {
        rec.maxSeq = Math.max(rec.maxSeq, sequenceNumber);
      }
    },

    async finalize(uploadId, totalChunks) {
      const rec = uploads.get(uploadId);
      if (!rec) throw new Error("unknown uploadId");
      const ordered: Blob[] = [];
      for (let i = 0; i < totalChunks; i += 1) {
        const part = rec.parts.get(i);
        if (!part) throw new Error(`missing sequence ${i}`);
        ordered.push(part);
      }
      const blob = new Blob(ordered, { type: "video/webm" });
      return {
        videoUrl: URL.createObjectURL(blob),
        seekRepairStatus: "none",
      };
    },

    async abort(uploadId) {
      uploads.delete(uploadId);
    },
  };
}
