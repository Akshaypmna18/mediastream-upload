/**
 * SHA-256 helpers for chunk integrity (idempotent retries).
 */

/**
 * Compute lowercase hex SHA-256 of a {@link Blob} via Web Crypto.
 *
 * @param blob - Chunk bytes to hash
 * @returns 64-character lowercase hex digest
 */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
