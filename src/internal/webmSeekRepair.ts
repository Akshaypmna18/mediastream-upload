/**
 * Seekability helpers for streamed MediaRecorder WebM.
 *
 * Goals:
 * - Patch Duration in Part 0 without changing part byte length (R2/S3 equal-size rule).
 * - Reserve + patch a Segment-level SeekHead that points at trailing Cues.
 * - Build a trailing Cues element so browsers can HTTP-Range seek.
 * - Repair abrupt (unpatched) seals via {@link repairAbruptWebmSeekability}.
 *
 * Important: never rewrite Segment's unknown-size marker — that would truncate
 * the logical file to whatever bytes we parsed (usually just Part 0).
 *
 * Pure `Uint8Array` EBML — zero runtime dependencies (safe for browsers and Workers).
 */

/**
 * IDs as returned by EBML VINT decode (length marker stripped).
 * Wire octets differ — see `elementId()` for encodings we emit.
 */
const ID_EBML = 0xa45dfa3;
const ID_SEGMENT = 0x8538067;
const ID_INFO = 0x549a966;
const ID_DURATION = 0x489;
const ID_TIMECODE_SCALE = 0xad7b1;
const ID_CLUSTER = 0xf43b675;
/** Tracks 0x1654AE6B with length-class nibble stripped → 0x654AE6B */
const ID_TRACKS = 0x654ae6b;
const ID_TIMECODE = 0x67;
const ID_VOID = 0x6c;
const ID_CUES = 0xc53bb6b;
const ID_CUE_POINT = 0x3b;
const ID_CUE_TIME = 0x33;
const ID_CUE_TRACK_POSITIONS = 0x37;
const ID_CUE_TRACK = 0x77;
const ID_CUE_CLUSTER_POSITION = 0x71;
/** SeekHead 0x114D9B74 with length-class nibble stripped → 0x14D9B74 */
const ID_SEEKHEAD = 0x14d9b74;
/** Seek 0x4DBB → decoded 2-byte id value 0xDBB */
const ID_SEEK = 0xdbb;

/** Wire octets for Cues element id (used inside SeekID binary). */
const CUES_ID_WIRE = new Uint8Array([0x1c, 0x53, 0xbb, 0x6b]);

/** Fixed Segment-level Void size reserved for SeekHead + padding. */
export const SEEKHEAD_RESERVE_BYTES = 64;

export type WebmCuePoint = {
  /** Cluster Timecode (already in TimecodeScale units). */
  time: number;
  /** Byte offset of Cluster relative to Segment payload start. */
  clusterPosition: number;
};

export type WebmScanResult = {
  /** Absolute file offset where Segment payload begins. */
  segmentPayloadOffset: number;
  /** TimecodeScale in nanoseconds (default 1_000_000 = 1ms). */
  timecodeScale: number;
  cues: WebmCuePoint[];
};

export type ReserveResult =
  | { ok: true; bytes: Uint8Array; reason: "inserted_void" | "already_ready" }
  | { ok: false; reason: string };

function readVint(
  view: Uint8Array,
  offset: number,
): { value: number; length: number } | null {
  if (offset >= view.length) return null;
  const first = view[offset]!;
  let length = 1;
  let mask = 0x80;
  while (length <= 8 && (first & mask) === 0) {
    length += 1;
    mask >>= 1;
  }
  if (length > 8 || offset + length > view.length) return null;

  // Unknown-size marker (all data bits 1) — treat as "rest of buffer".
  let allOnes = true;
  for (let i = 0; i < length; i += 1) {
    const b = view[offset + i]!;
    const dataMask = i === 0 ? mask - 1 : 0xff;
    if ((b & dataMask) !== dataMask) {
      allOnes = false;
      break;
    }
  }
  if (allOnes) {
    return { value: -1, length };
  }

  let value = first & (mask - 1);
  for (let i = 1; i < length; i += 1) {
    value = value * 256 + view[offset + i]!;
  }
  return { value, length };
}

function writeVint(value: number, minLength = 1): Uint8Array {
  let length = minLength;
  while (length < 8) {
    const max = (1 << (7 * length)) - 1;
    if (value <= max) break;
    length += 1;
  }
  const out = new Uint8Array(length);
  const flag = 1 << (8 - length);
  for (let i = length - 1; i >= 0; i -= 1) {
    out[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  out[0] = (out[0]! & (flag - 1)) | flag;
  return out;
}

function idBytes(id: number): Uint8Array {
  // Encode element ID as an EBML VINT with the ID's class bits already in `id`.
  // Matroska IDs are stored as their literal octet sequences; reconstruct from
  // the numeric form used after VINT decode by re-applying the length marker.
  if (id <= 0x7f) return new Uint8Array([id | 0x80]);
  if (id <= 0x3fff) {
    return new Uint8Array([((id >> 8) & 0x3f) | 0x40, id & 0xff]);
  }
  if (id <= 0x1fffff) {
    return new Uint8Array([
      ((id >> 16) & 0x1f) | 0x20,
      (id >> 8) & 0xff,
      id & 0xff,
    ]);
  }
  return new Uint8Array([
    ((id >> 24) & 0x0f) | 0x10,
    (id >> 16) & 0xff,
    (id >> 8) & 0xff,
    id & 0xff,
  ]);
}

/** Encode a known Matroska/WebM ID using its canonical wire octets. */
function elementId(id: number): Uint8Array {
  // Prefer canonical encodings for IDs we emit.
  switch (id) {
    case ID_DURATION:
      return new Uint8Array([0x44, 0x89]);
    case ID_CUES:
      return new Uint8Array([0x1c, 0x53, 0xbb, 0x6b]);
    case ID_CUE_POINT:
      return new Uint8Array([0xbb]);
    case ID_CUE_TIME:
      return new Uint8Array([0xb3]);
    case ID_CUE_TRACK_POSITIONS:
      return new Uint8Array([0xb7]);
    case ID_CUE_TRACK:
      return new Uint8Array([0xf7]);
    case ID_CUE_CLUSTER_POSITION:
      return new Uint8Array([0xf1]);
    case ID_VOID:
      return new Uint8Array([0xec]);
    case ID_SEEKHEAD:
      return new Uint8Array([0x11, 0x4d, 0x9b, 0x74]);
    case ID_SEEK:
      return new Uint8Array([0x4d, 0xbb]);
    default:
      return idBytes(id);
  }
}

function encodeUintElement(id: number, value: number): Uint8Array {
  const idB = elementId(id);
  // Minimal big-endian uint payload.
  let width = 1;
  let tmp = value;
  while (tmp >= 256) {
    width += 1;
    tmp = Math.floor(tmp / 256);
  }
  const payload = new Uint8Array(width);
  let v = value;
  for (let i = width - 1; i >= 0; i -= 1) {
    payload[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  const sizeB = writeVint(payload.length);
  const out = new Uint8Array(idB.length + sizeB.length + payload.length);
  out.set(idB, 0);
  out.set(sizeB, idB.length);
  out.set(payload, idB.length + sizeB.length);
  return out;
}

function encodeFloat64Element(id: number, value: number): Uint8Array {
  const idB = elementId(id);
  const sizeB = writeVint(8);
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, value, false);
  const payload = new Uint8Array(buf);
  const out = new Uint8Array(idB.length + sizeB.length + payload.length);
  out.set(idB, 0);
  out.set(sizeB, idB.length);
  out.set(payload, idB.length + sizeB.length);
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

type ElementRef = {
  id: number;
  /** Absolute offset of element ID. */
  idOffset: number;
  /** Absolute offset of size VINT. */
  sizeOffset: number;
  sizeLength: number;
  /** Decoded size (-1 = unknown). */
  dataSize: number;
  /** Absolute offset of element data. */
  dataOffset: number;
  /** Absolute end offset (exclusive); for unknown size, view.length. */
  end: number;
};

function readElement(view: Uint8Array, offset: number): ElementRef | null {
  const idV = readVint(view, offset);
  if (!idV) return null;
  const sizeV = readVint(view, offset + idV.length);
  if (!sizeV) return null;
  const dataOffset = offset + idV.length + sizeV.length;
  const end =
    sizeV.value < 0
      ? view.length
      : Math.min(view.length, dataOffset + sizeV.value);
  return {
    id: idV.value,
    idOffset: offset,
    sizeOffset: offset + idV.length,
    sizeLength: sizeV.length,
    dataSize: sizeV.value,
    dataOffset,
    end,
  };
}

function readUintPayload(view: Uint8Array, start: number, end: number): number {
  let value = 0;
  for (let i = start; i < end; i += 1) {
    value = value * 256 + view[i]!;
  }
  return value;
}

/** Segment-level Matroska IDs — used to bound unknown-size children. */
const SEGMENT_LEVEL_IDS = new Set<number>([
  ID_SEEKHEAD,
  ID_INFO,
  ID_TRACKS,
  ID_CLUSTER,
  ID_CUES,
  ID_VOID,
]);

/**
 * MediaRecorder often emits Clusters (and Segment) with EBML unknown-size.
 * `readElement` then sets `end = view.length`, so a naive walk treats the
 * first unknown-size Cluster as the entire remainder — cueCount stays 1.
 * Resolve the real end by walking children until a Segment-level sibling ID.
 */
function resolveElementEnd(
  bytes: Uint8Array,
  el: ElementRef,
  parentEnd: number,
  siblingIds: Set<number>,
): number {
  if (el.dataSize >= 0) {
    return Math.min(el.end, parentEnd);
  }

  let off = el.dataOffset;
  while (off < parentEnd) {
    const next = readElement(bytes, off);
    if (!next) return off;
    if (siblingIds.has(next.id)) {
      return next.idOffset;
    }
    // Nested unknown-size: advance by walking its children with the same
    // sibling set (Cluster-level IDs are not Segment siblings, so we keep
    // scanning until a real Segment sibling appears).
    if (next.dataSize < 0) {
      const resolved = resolveElementEnd(bytes, next, parentEnd, siblingIds);
      // Guard against non-advancing resolves (corrupt / ambiguous EBML).
      off = resolved > off ? resolved : Math.min(parentEnd, off + 1);
    } else {
      off = next.end;
    }
  }
  return parentEnd;
}

/**
 * Walk top-level + nested elements needed for cues / duration.
 * Stops early once Segment is found; then walks Segment children.
 */
export function scanWebmForSeekMetadata(bytes: Uint8Array): WebmScanResult {
  const cues: WebmCuePoint[] = [];
  let segmentPayloadOffset = -1;
  let timecodeScale = 1_000_000;

  let offset = 0;
  // Skip EBML header if present.
  const first = readElement(bytes, 0);
  if (first && first.id === ID_EBML) {
    offset = first.end;
  }

  while (offset < bytes.length) {
    const el = readElement(bytes, offset);
    if (!el) break;

    if (el.id === ID_SEGMENT) {
      segmentPayloadOffset = el.dataOffset;
      const segmentEnd = resolveElementEnd(
        bytes,
        el,
        bytes.length,
        new Set(), // Segment is top-level; consume to EOF
      );
      let childOff = el.dataOffset;
      while (childOff < segmentEnd) {
        const child = readElement(bytes, childOff);
        if (!child) break;

        const childEnd = resolveElementEnd(
          bytes,
          child,
          segmentEnd,
          SEGMENT_LEVEL_IDS,
        );

        if (child.id === ID_INFO) {
          let infoOff = child.dataOffset;
          const infoEnd = child.dataSize >= 0 ? child.end : childEnd;
          while (infoOff < infoEnd) {
            const infoChild = readElement(bytes, infoOff);
            if (!infoChild) break;
            if (infoChild.id === ID_TIMECODE_SCALE) {
              timecodeScale = readUintPayload(
                bytes,
                infoChild.dataOffset,
                infoChild.end,
              );
            }
            infoOff =
              infoChild.dataSize >= 0
                ? infoChild.end
                : resolveElementEnd(
                    bytes,
                    infoChild,
                    infoEnd,
                    new Set([ID_TIMECODE_SCALE, ID_DURATION, ID_VOID]),
                  );
          }
        } else if (child.id === ID_CLUSTER) {
          let clusterTime = 0;
          let tOff = child.dataOffset;
          // Timecode is typically the first child of Cluster.
          while (tOff < Math.min(childEnd, child.dataOffset + 64)) {
            const c = readElement(bytes, tOff);
            if (!c) break;
            if (c.id === ID_TIMECODE) {
              clusterTime = readUintPayload(bytes, c.dataOffset, c.end);
              break;
            }
            tOff = c.dataSize >= 0 ? c.end : c.dataOffset + 1;
          }
          cues.push({
            time: clusterTime,
            clusterPosition: child.idOffset - segmentPayloadOffset,
          });
        }

        childOff = childEnd;
      }
      break;
    }

    offset = el.dataSize >= 0 ? el.end : bytes.length;
  }

  if (segmentPayloadOffset < 0) {
    // Fallback: treat file start as segment payload (should not happen).
    segmentPayloadOffset = 0;
  }

  return { segmentPayloadOffset, timecodeScale, cues };
}

/**
 * Scan concatenated MediaRecorder blobs with running file offsets.
 * Clusters may span blob boundaries rarely; we scan each blob independently
 * with a baseOffset, which matches MediaRecorder timeslice emission.
 */
export async function scanBlobsForSeekMetadata(
  blobs: Blob[],
): Promise<WebmScanResult> {
  const chunks: Uint8Array[] = [];
  for (const blob of blobs) {
    chunks.push(new Uint8Array(await blob.arrayBuffer()));
  }
  return scanWebmForSeekMetadata(concatBytes(chunks));
}

/**
 * Ensure Part 0 Info can receive a same-size Duration patch later.
 * Inserts an 11-byte Void into Info when needed; leaves bytes unchanged when
 * Duration or a usable Void is already present.
 */
export function ensureDurationPatchable(chunk0: Uint8Array): ReserveResult {
  let offset = 0;
  const first = readElement(chunk0, 0);
  if (first && first.id === ID_EBML) offset = first.end;

  const segment = readElement(chunk0, offset);
  if (!segment || segment.id !== ID_SEGMENT) {
    return { ok: false, reason: "segment_not_found" };
  }

  let info: ElementRef | null = null;
  let childOff = segment.dataOffset;
  while (childOff < segment.end) {
    const child = readElement(chunk0, childOff);
    if (!child) break;
    if (child.id === ID_INFO) {
      info = child;
      break;
    }
    childOff = child.end;
  }
  if (!info) {
    return { ok: false, reason: "info_not_found" };
  }
  if (info.dataSize < 0) {
    return { ok: false, reason: "info_unknown_size" };
  }

  let iOff = info.dataOffset;
  while (iOff < info.end) {
    const ic = readElement(chunk0, iOff);
    if (!ic) break;
    if (ic.id === ID_DURATION && (ic.dataSize === 4 || ic.dataSize === 8)) {
      return { ok: true, bytes: chunk0, reason: "already_ready" };
    }
    if (ic.id === ID_VOID && ic.end - ic.idOffset >= 11) {
      return { ok: true, bytes: chunk0, reason: "already_ready" };
    }
    iOff = ic.end;
  }

  // Void sized so id+size+payload == Duration's id+size+payload (11 bytes).
  const durationTotalLen = elementId(ID_DURATION).length + 1 + 8;
  const voidId = elementId(ID_VOID);
  const voidPayloadLen = durationTotalLen - voidId.length - 1;
  const voidSizeB = writeVint(voidPayloadLen);
  if (voidId.length + voidSizeB.length + voidPayloadLen !== durationTotalLen) {
    return { ok: false, reason: "void_size_vint_mismatch" };
  }
  const voidBytes = concatBytes([
    voidId,
    voidSizeB,
    new Uint8Array(voidPayloadLen),
  ]);

  const newInfoPayloadLength = info.dataSize + voidBytes.length;
  const newInfoSizeBytes = writeVint(newInfoPayloadLength, info.sizeLength);
  if (newInfoSizeBytes.length !== info.sizeLength) {
    // Growing the Info size field would shift later bytes unpredictably for
    // same-size Part 0 replace — refuse rather than corrupt offsets.
    return { ok: false, reason: "info_size_vint_grew" };
  }

  const bytes = concatBytes([
    chunk0.slice(0, info.sizeOffset),
    newInfoSizeBytes,
    chunk0.slice(info.dataOffset, info.end),
    voidBytes,
    chunk0.slice(info.end),
  ]);
  return { ok: true, bytes, reason: "inserted_void" };
}

/**
 * Reserve a fixed-size Segment-level Void (after Info) for a future SeekHead
 * that points at trailing Cues. Same-size patch on Part 0 at finalize.
 */
export function ensureSeekHeadReservable(
  chunk0: Uint8Array,
  reserveBytes: number = SEEKHEAD_RESERVE_BYTES,
): ReserveResult {
  if (reserveBytes < 32) {
    return { ok: false, reason: "reserve_too_small" };
  }

  let offset = 0;
  const first = readElement(chunk0, 0);
  if (first && first.id === ID_EBML) offset = first.end;

  const segment = readElement(chunk0, offset);
  if (!segment || segment.id !== ID_SEGMENT) {
    return { ok: false, reason: "segment_not_found" };
  }

  let info: ElementRef | null = null;
  let existingSeekHead = false;
  let usableVoid: ElementRef | null = null;
  let childOff = segment.dataOffset;
  while (childOff < segment.end) {
    const child = readElement(chunk0, childOff);
    if (!child) break;
    if (child.id === ID_INFO) info = child;
    if (child.id === ID_SEEKHEAD) existingSeekHead = true;
    if (
      child.id === ID_VOID &&
      child.end - child.idOffset >= reserveBytes &&
      (usableVoid == null ||
        child.end - child.idOffset > usableVoid.end - usableVoid.idOffset)
    ) {
      usableVoid = child;
    }
    // Stop once we hit the first Cluster — reservations belong in the header.
    if (child.id === ID_CLUSTER) break;
    childOff = child.end;
  }

  if (existingSeekHead || usableVoid) {
    return { ok: true, bytes: chunk0, reason: "already_ready" };
  }
  if (!info) {
    return { ok: false, reason: "info_not_found" };
  }

  const voidId = elementId(ID_VOID);
  const payloadLen = reserveBytes - voidId.length - 1;
  if (payloadLen < 1) {
    return { ok: false, reason: "reserve_too_small_for_void" };
  }
  const voidSizeB = writeVint(payloadLen);
  if (voidId.length + voidSizeB.length + payloadLen !== reserveBytes) {
    // Try 2-byte size vint.
    const size2 = writeVint(reserveBytes - voidId.length - 2, 2);
    const pay2 = reserveBytes - voidId.length - size2.length;
    if (pay2 < 0 || voidId.length + size2.length + pay2 !== reserveBytes) {
      return { ok: false, reason: "void_size_vint_mismatch" };
    }
    const voidBytes = concatBytes([voidId, size2, new Uint8Array(pay2)]);
    const bytes = concatBytes([
      chunk0.slice(0, info.end),
      voidBytes,
      chunk0.slice(info.end),
    ]);
    return { ok: true, bytes, reason: "inserted_void" };
  }

  const voidBytes = concatBytes([
    voidId,
    voidSizeB,
    new Uint8Array(payloadLen),
  ]);
  const bytes = concatBytes([
    chunk0.slice(0, info.end),
    voidBytes,
    chunk0.slice(info.end),
  ]);
  return { ok: true, bytes, reason: "inserted_void" };
}

function buildSeekHeadForCues(cuesPosition: number): Uint8Array {
  const seekIdEl = concatBytes([
    new Uint8Array([0x53, 0xab]),
    writeVint(4),
    CUES_ID_WIRE,
  ]);

  const posPayload = new Uint8Array(8);
  let v = Math.max(0, Math.floor(cuesPosition));
  for (let i = 7; i >= 0; i -= 1) {
    posPayload[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  const seekPosEl = concatBytes([
    new Uint8Array([0x53, 0xac]),
    writeVint(8),
    posPayload,
  ]);

  const seekPayload = concatBytes([seekIdEl, seekPosEl]);
  const seekEl = concatBytes([
    elementId(ID_SEEK),
    writeVint(seekPayload.length),
    seekPayload,
  ]);

  return concatBytes([
    elementId(ID_SEEKHEAD),
    writeVint(seekEl.length),
    seekEl,
  ]);
}

/**
 * Write SeekHead (Cues pointer) into a reserved Segment-level Void without
 * changing Part 0 byte length. `cuesPosition` is relative to Segment payload.
 */
export function patchSeekHeadCuesSameSize(
  part0: Uint8Array,
  cuesPosition: number,
  reserveBytes: number = SEEKHEAD_RESERVE_BYTES,
): Uint8Array | null {
  const out = part0.slice();
  let offset = 0;
  const first = readElement(out, 0);
  if (first && first.id === ID_EBML) offset = first.end;

  const segment = readElement(out, offset);
  if (!segment || segment.id !== ID_SEGMENT) return null;

  let targetVoid: ElementRef | null = null;
  let existingSeekHead: ElementRef | null = null;
  let childOff = segment.dataOffset;
  while (childOff < segment.end) {
    const child = readElement(out, childOff);
    if (!child) break;
    if (child.id === ID_SEEKHEAD) existingSeekHead = child;
    if (
      child.id === ID_VOID &&
      child.end - child.idOffset >= reserveBytes &&
      (targetVoid == null ||
        child.end - child.idOffset < targetVoid.end - targetVoid.idOffset)
    ) {
      // Prefer the smallest Void that still fits (our reserved slot).
      targetVoid = child;
    }
    if (child.id === ID_CLUSTER) break;
    childOff = child.end;
  }

  const seekHead = buildSeekHeadForCues(cuesPosition);
  if (seekHead.length > reserveBytes) return null;

  // If SeekHead already exists and is large enough, overwrite in place + pad.
  const dest = existingSeekHead ?? targetVoid;
  if (!dest) return null;
  const destLen = dest.end - dest.idOffset;
  if (destLen < seekHead.length) return null;

  out.set(seekHead, dest.idOffset);
  const remaining = destLen - seekHead.length;
  if (remaining === 0) return out;
  if (remaining < 2) {
    out.fill(0, dest.idOffset + seekHead.length, dest.end);
    return out;
  }

  const voidId = elementId(ID_VOID);
  const payloadLen = remaining - voidId.length - 1;
  if (payloadLen < 0) return null;
  const voidSizeB = writeVint(payloadLen);
  if (voidId.length + voidSizeB.length + payloadLen !== remaining) {
    const size2 = writeVint(remaining - voidId.length - 2, 2);
    const pay2 = remaining - voidId.length - size2.length;
    if (pay2 < 0) return null;
    const padAt = dest.idOffset + seekHead.length;
    out.set(voidId, padAt);
    out.set(size2, padAt + voidId.length);
    out.fill(0, padAt + voidId.length + size2.length, dest.end);
    return out;
  }

  const padAt = dest.idOffset + seekHead.length;
  out.set(voidId, padAt);
  out.set(voidSizeB, padAt + voidId.length);
  out.fill(0, padAt + voidId.length + voidSizeB.length, dest.end);
  return out;
}

/**
 * Patch Duration inside Part 0 without changing byte length.
 * Prefer in-place float overwrite; otherwise consume a Void element.
 * Returns null if patching is not possible without growing the buffer.
 */
export function patchDurationSameSize(
  part0: Uint8Array,
  durationMs: number,
  timecodeScale = 1_000_000,
): Uint8Array | null {
  const out = part0.slice();
  // Duration is stored in TimecodeScale units (not raw ms unless scale is 1ms).
  const durationInScale = (durationMs * 1_000_000) / timecodeScale;

  // Locate Segment → Info (and optional Duration / Void).
  let offset = 0;
  const first = readElement(out, 0);
  if (first && first.id === ID_EBML) offset = first.end;

  const segment = readElement(out, offset);
  if (!segment || segment.id !== ID_SEGMENT) return null;

  let info: ElementRef | null = null;
  let durationEl: ElementRef | null = null;
  /** Void only usable if it lives inside Info (Duration must be an Info child). */
  let voidInInfo: ElementRef | null = null;

  let childOff = segment.dataOffset;
  while (childOff < segment.end) {
    const child = readElement(out, childOff);
    if (!child) break;
    if (child.id === ID_INFO) {
      info = child;
      let iOff = child.dataOffset;
      while (iOff < child.end) {
        const ic = readElement(out, iOff);
        if (!ic) break;
        if (ic.id === ID_DURATION) durationEl = ic;
        if (
          ic.id === ID_VOID &&
          (voidInInfo == null || ic.dataSize > voidInInfo.dataSize)
        ) {
          voidInInfo = ic;
        }
        iOff = ic.end;
      }
    }
    childOff = child.end;
  }

  if (!info) return null;

  // Case 1: Duration exists — overwrite float payload in place.
  if (durationEl && durationEl.dataSize === 8) {
    new DataView(out.buffer, out.byteOffset, out.byteLength).setFloat64(
      durationEl.dataOffset,
      durationInScale,
      false,
    );
    return out;
  }
  if (durationEl && durationEl.dataSize === 4) {
    new DataView(out.buffer, out.byteOffset, out.byteLength).setFloat32(
      durationEl.dataOffset,
      durationInScale,
      false,
    );
    return out;
  }

  // Case 2: Insert Duration by consuming a Void inside Info (same total length).
  const durationBytes = encodeFloat64Element(ID_DURATION, durationInScale);
  if (
    !voidInInfo ||
    voidInInfo.end - voidInInfo.idOffset < durationBytes.length
  ) {
    return null;
  }

  const voidStart = voidInInfo.idOffset;
  const voidEnd = voidInInfo.end;
  const remaining = voidEnd - voidStart - durationBytes.length;

  // Write Duration at the Void's former location.
  out.set(durationBytes, voidStart);

  if (remaining <= 0) {
    return out;
  }

  // Leftover becomes a smaller Void.
  if (remaining < 2) {
    return null;
  }

  const newVoidId = elementId(ID_VOID);
  const payloadLen = remaining - newVoidId.length - 1;
  if (payloadLen < 0) return null;
  const newVoidSize = writeVint(payloadLen);
  if (newVoidId.length + newVoidSize.length + payloadLen !== remaining) {
    const sizeB = writeVint(remaining - newVoidId.length - 2, 2);
    const pay = remaining - newVoidId.length - sizeB.length;
    if (pay < 0) return null;
    out.set(newVoidId, voidStart + durationBytes.length);
    out.set(sizeB, voidStart + durationBytes.length + newVoidId.length);
    out.fill(
      0,
      voidStart + durationBytes.length + newVoidId.length + sizeB.length,
      voidEnd,
    );
    return out;
  }

  out.set(newVoidId, voidStart + durationBytes.length);
  out.set(newVoidSize, voidStart + durationBytes.length + newVoidId.length);
  out.fill(
    0,
    voidStart + durationBytes.length + newVoidId.length + newVoidSize.length,
    voidEnd,
  );
  return out;
}

/**
 * Build a Cues element. CueClusterPosition is relative to Segment payload.
 * Sparse: keep about one cue per ~2s (or every Nth cluster) to stay small.
 */
export function buildCuesElement(
  cues: WebmCuePoint[],
  options?: { trackNumber?: number; maxCues?: number },
): Uint8Array {
  const trackNumber = options?.trackNumber ?? 1;
  const maxCues = options?.maxCues ?? 256;
  if (cues.length === 0) {
    return concatBytes([elementId(ID_CUES), writeVint(0)]);
  }

  let selected = cues;
  if (cues.length > maxCues) {
    const step = Math.ceil(cues.length / maxCues);
    selected = cues.filter((_, i) => i % step === 0);
    const last = cues[cues.length - 1]!;
    if (selected[selected.length - 1] !== last) selected.push(last);
  }

  const cuePointBytes: Uint8Array[] = [];
  for (const cue of selected) {
    const cueTrack = encodeUintElement(ID_CUE_TRACK, trackNumber);
    const cuePos = encodeUintElement(
      ID_CUE_CLUSTER_POSITION,
      cue.clusterPosition,
    );
    const positionsPayload = concatBytes([cueTrack, cuePos]);
    const positions = concatBytes([
      elementId(ID_CUE_TRACK_POSITIONS),
      writeVint(positionsPayload.length),
      positionsPayload,
    ]);
    const cueTime = encodeUintElement(ID_CUE_TIME, cue.time);
    const pointPayload = concatBytes([cueTime, positions]);
    cuePointBytes.push(
      concatBytes([
        elementId(ID_CUE_POINT),
        writeVint(pointPayload.length),
        pointPayload,
      ]),
    );
  }

  const cuesPayload = concatBytes(cuePointBytes);
  return concatBytes([
    elementId(ID_CUES),
    writeVint(cuesPayload.length),
    cuesPayload,
  ]);
}

export type AbruptSeekRepairResult =
  | {
      ok: true;
      bytes: Uint8Array;
      cueCount: number;
      durationMs: number;
      cuesBytes: number;
      mediaBytes: number;
    }
  | { ok: false; reason: string };

/**
 * Post-seal repair for abrupt finalize (no client Duration/SeekHead/Cues).
 * Relies on voids reserved in chunk 0 during recording; appends trailing Cues.
 * Duration is inferred from the last cluster timecode when not provided.
 */
export function repairAbruptWebmSeekability(
  media: Uint8Array,
  options?: { durationMs?: number },
): AbruptSeekRepairResult {
  const scan = scanWebmForSeekMetadata(media);
  if (scan.cues.length === 0) {
    return { ok: false, reason: "no_clusters" };
  }

  const lastCue = scan.cues[scan.cues.length - 1]!;
  const inferredMs = (lastCue.time * scan.timecodeScale) / 1_000_000;
  // Last cluster *start* underestimates total length; pad one timeslice.
  const durationMs = Math.max(options?.durationMs ?? 0, inferredMs + 1000);

  const cuesEl = buildCuesElement(scan.cues);
  const cuesPosition = Math.max(
    0,
    media.byteLength - scan.segmentPayloadOffset,
  );

  let out: Uint8Array = media.slice();
  const patchedDuration = patchDurationSameSize(
    out,
    durationMs,
    scan.timecodeScale,
  );
  if (patchedDuration && patchedDuration.byteLength === out.byteLength) {
    out = patchedDuration;
  }

  const patchedSeek = patchSeekHeadCuesSameSize(out, cuesPosition);
  if (patchedSeek && patchedSeek.byteLength === out.byteLength) {
    out = patchedSeek;
  }

  return {
    ok: true,
    bytes: concatBytes([out, cuesEl]),
    cueCount: scan.cues.length,
    durationMs,
    cuesBytes: cuesEl.byteLength,
    mediaBytes: media.byteLength,
  };
}
