/**
 * Minimal WebM/EBML builders for seek-repair unit tests.
 * Not part of the public package API.
 */

function writeVint(value: number, minLength = 1): Uint8Array {
  let length = minLength;
  while (length < 8) {
    const max = (1 << (7 * length)) - 1;
    if (value <= max) break;
    length += 1;
  }
  const out = new Uint8Array(length);
  const flag = 1 << (8 - length);
  let v = value;
  for (let i = length - 1; i >= 0; i -= 1) {
    out[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  out[0] = (out[0]! & (flag - 1)) | flag;
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function el(id: Uint8Array, payload: Uint8Array): Uint8Array {
  return concat([id, writeVint(payload.length), payload]);
}

const ID = {
  ebml: new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]),
  segment: new Uint8Array([0x18, 0x53, 0x80, 0x67]),
  info: new Uint8Array([0x15, 0x49, 0xa9, 0x66]),
  timecodeScale: new Uint8Array([0x2a, 0xd7, 0xb1]),
  tracks: new Uint8Array([0x16, 0x54, 0xae, 0x6b]),
  cluster: new Uint8Array([0x1f, 0x43, 0xb6, 0x75]),
  timecode: new Uint8Array([0xe7]),
  void: new Uint8Array([0xec]),
} as const;

/** Unknown-size VINT (1-byte class used by MediaRecorder for Segment/Cluster). */
const UNKNOWN_SIZE_1 = new Uint8Array([0xff]);

function encodeUint(value: number): Uint8Array {
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
  return payload;
}

function cluster(timecode: number, unknownSize: boolean): Uint8Array {
  const tc = el(ID.timecode, encodeUint(timecode));
  // Pad a few bytes so the cluster is non-trivial.
  const pad = new Uint8Array([0xa3, 0x80]); // SimpleBlock empty-ish placeholder
  const payload = concat([tc, pad]);
  if (unknownSize) {
    return concat([ID.cluster, UNKNOWN_SIZE_1, payload]);
  }
  return el(ID.cluster, payload);
}

export type MinimalWebmOptions = {
  /** Cluster timecodes in TimecodeScale units (default ms). */
  clusterTimes?: number[];
  /** Emit Clusters with EBML unknown-size (Track C regression fixture). */
  unknownSizeClusters?: boolean;
};

/**
 * Build a tiny WebM: EBML + Segment(Info+Tracks+Clusters).
 * Suitable for ensure/patch/scan/repair unit tests.
 */
export function buildMinimalWebm(options: MinimalWebmOptions = {}): Uint8Array {
  const times = options.clusterTimes ?? [0, 2000, 4000, 6000];
  const unknown = options.unknownSizeClusters ?? true;

  const scale = el(ID.timecodeScale, encodeUint(1_000_000));
  const info = el(ID.info, scale);
  const tracks = el(ID.tracks, new Uint8Array(0));
  const clusters = times.map((t) => cluster(t, unknown));

  const segmentPayload = concat([info, tracks, ...clusters]);
  // Segment with unknown size (typical MediaRecorder).
  const segment = concat([ID.segment, UNKNOWN_SIZE_1, segmentPayload]);

  // Minimal EBML header body (DocType would live here; empty is enough for our parser).
  const ebml = el(ID.ebml, new Uint8Array([0x42, 0x86, 0x81, 0x01]));

  return concat([ebml, segment]);
}
