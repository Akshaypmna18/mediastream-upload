import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** S3/R2 multipart minimum for non-final parts — taught on finalize. */
export const MIN_NON_FINAL_BYTES = 5 * 1024 * 1024;

export type UploadStatus = "active" | "completed" | "aborted";

export type PartRecord = {
  checksum: string;
  size: number;
  fileName: string;
};

export type UploadRecord = {
  id: string;
  status: UploadStatus;
  contentType: string;
  parts: Map<number, PartRecord>;
  /** Absolute path to concatenated .webm after finalize */
  videoPath?: string;
  createdAt: number;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, "../data");

mkdirSync(DATA_DIR, { recursive: true });

const uploads = new Map<string, UploadRecord>();

function uploadDir(id: string): string {
  return path.join(DATA_DIR, id);
}

function partPath(id: string, seq: number): string {
  return path.join(uploadDir(id), `part-${seq}.bin`);
}

export function createUpload(contentType = "video/webm"): UploadRecord {
  const id = randomUUID();
  mkdirSync(uploadDir(id), { recursive: true });
  const record: UploadRecord = {
    id,
    status: "active",
    contentType,
    parts: new Map(),
    createdAt: Date.now(),
  };
  uploads.set(id, record);
  return record;
}

export function getUpload(id: string): UploadRecord | undefined {
  return uploads.get(id);
}

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export type PutPartResult =
  | { ok: true }
  | { ok: false; status: 404 | 409; error: string };

/**
 * Store a chunk. Idempotent when checksum matches. Supports Part 0 replace.
 */
export function putPart(
  id: string,
  sequenceNumber: number,
  checksum: string,
  bytes: Buffer,
  replace: boolean,
): PutPartResult {
  const upload = uploads.get(id);
  if (!upload || upload.status === "aborted") {
    return { ok: false, status: 404, error: "upload not found" };
  }
  if (upload.status === "completed") {
    return { ok: false, status: 409, error: "upload already completed" };
  }

  const existing = upload.parts.get(sequenceNumber);
  if (existing) {
    if (existing.checksum === checksum) {
      return { ok: true };
    }
    if (!replace) {
      return {
        ok: false,
        status: 409,
        error: "checksum conflict (use replace for sequence 0 rewrite)",
      };
    }
    if (sequenceNumber !== 0) {
      return {
        ok: false,
        status: 409,
        error: "replace is only allowed for sequence 0",
      };
    }
    if (existing.size !== bytes.length) {
      return {
        ok: false,
        status: 409,
        error: "replace must keep the same byte length",
      };
    }
  }

  const expected = checksum.toLowerCase();
  const actual = sha256Hex(bytes);
  if (actual !== expected) {
    return {
      ok: false,
      status: 409,
      error: `checksum mismatch: expected ${expected}, got ${actual}`,
    };
  }

  const fileName = `part-${sequenceNumber}.bin`;
  writeFileSync(partPath(id, sequenceNumber), bytes);
  upload.parts.set(sequenceNumber, {
    checksum: expected,
    size: bytes.length,
    fileName,
  });
  return { ok: true };
}

export type FinalizeResult =
  | {
      ok: true;
      videoPath: string;
      seekRepairStatus: "none" | "skipped";
      abrupt: boolean;
    }
  | { ok: false; status: 404 | 409; error: string; missing?: number[] };

/**
 * Gap-check, enforce 5 MiB on non-final parts, concatenate to one .webm.
 */
export function finalizeUpload(
  id: string,
  totalChunks: number,
  abrupt: boolean,
): FinalizeResult {
  const upload = uploads.get(id);
  if (!upload || upload.status === "aborted") {
    return { ok: false, status: 404, error: "upload not found" };
  }

  if (upload.status === "completed" && upload.videoPath) {
    return {
      ok: true,
      videoPath: upload.videoPath,
      seekRepairStatus: abrupt ? "skipped" : "none",
      abrupt,
    };
  }

  if (totalChunks < 1) {
    return {
      ok: false,
      status: 409,
      error: "totalChunks must be >= 1",
    };
  }

  const missing: number[] = [];
  for (let i = 0; i < totalChunks; i += 1) {
    if (!upload.parts.has(i)) missing.push(i);
  }
  if (missing.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "missing sequences",
      missing,
    };
  }

  // Non-final parts must be ≥ 5 MiB (S3/R2 rule). Final part may be undersized.
  for (let i = 0; i < totalChunks - 1; i += 1) {
    const part = upload.parts.get(i)!;
    if (part.size < MIN_NON_FINAL_BYTES) {
      return {
        ok: false,
        status: 409,
        error: `sequence ${i} is non-final and must be >= ${MIN_NON_FINAL_BYTES} bytes (got ${part.size})`,
      };
    }
  }

  const chunks: Buffer[] = [];
  for (let i = 0; i < totalChunks; i += 1) {
    chunks.push(readFileSync(partPath(id, i)));
  }
  const videoPath = path.join(uploadDir(id), "video.webm");
  writeFileSync(videoPath, Buffer.concat(chunks));

  upload.status = "completed";
  upload.videoPath = videoPath;

  // Demo sample does not run Track B EBML repair — see README + abruptRepair.example.ts
  return {
    ok: true,
    videoPath,
    seekRepairStatus: abrupt ? "skipped" : "none",
    abrupt,
  };
}

export type AbortResult =
  | { ok: true }
  | { ok: false; status: 404 | 409; error: string };

export function abortUpload(id: string): AbortResult {
  const upload = uploads.get(id);
  if (!upload) {
    return { ok: false, status: 404, error: "upload not found" };
  }
  if (upload.status === "completed") {
    return { ok: false, status: 409, error: "cannot abort a completed upload" };
  }
  if (upload.status === "aborted") {
    return { ok: true };
  }

  upload.status = "aborted";
  const dir = uploadDir(id);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
  return { ok: true };
}
