import { afterEach, describe, expect, it, vi } from "vitest";
import { createR2Backend, HttpBackendError } from "../../adapters/r2";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createR2Backend", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs /uploads on init and returns uploadId", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ uploadId: "abc" }, 201));
    const backend = createR2Backend("https://worker.example.com/", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    const result = await backend.init({ contentType: "video/webm" });
    expect(result).toEqual({ uploadId: "abc" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://worker.example.com/uploads",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "video/webm" }),
      }),
    );
  });

  it("PUTs chunk with checksum and replace flags", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const backend = createR2Backend("https://worker.example.com", {
      fetch: fetchMock as unknown as typeof fetch,
    });
    const bytes = new Blob([new Uint8Array([1, 2, 3])]);

    await backend.sendChunk("u1", 0, "deadbeef", bytes, { replace: true });

    const [url, init] = fetchMock.mock.calls[0] as [string | URL, RequestInit];
    expect(String(url)).toBe(
      "https://worker.example.com/uploads/u1/chunks/0?replace=1",
    );
    expect(init.method).toBe("PUT");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/octet-stream",
      "X-Checksum-SHA256": "deadbeef",
      "X-Replace-Part": "1",
    });
    expect(init.body).toBe(bytes);
  });

  it("finalizes with keepalive and abrupt flag", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        videoUrl: "https://worker.example.com/uploads/u1",
        abrupt: true,
        seekRepairStatus: "pending",
      }),
    );
    const backend = createR2Backend("https://worker.example.com", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    const result = await backend.finalize("u1", 2, { abrupt: true });
    expect(result).toEqual({
      videoUrl: "https://worker.example.com/uploads/u1",
      abrupt: true,
      seekRepairStatus: "pending",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://worker.example.com/uploads/u1/finalize",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        body: JSON.stringify({ totalChunks: 2, abrupt: true }),
      }),
    );
  });

  it("abort ignores 404 and throws HttpBackendError otherwise", async () => {
    const fetch404 = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 }));
    const backend404 = createR2Backend("https://worker.example.com", {
      fetch: fetch404 as unknown as typeof fetch,
    });
    await expect(
      backend404.abort("u1", "pagehide_no_chunks"),
    ).resolves.toBeUndefined();

    const fetch500 = vi
      .fn()
      .mockResolvedValue(new Response("boom", { status: 500 }));
    const backend500 = createR2Backend("https://worker.example.com", {
      fetch: fetch500 as unknown as typeof fetch,
    });
    await expect(backend500.abort("u1", "x")).rejects.toBeInstanceOf(
      HttpBackendError,
    );
  });

  it("throws when init response lacks uploadId", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 201));
    const backend = createR2Backend("https://worker.example.com", {
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(backend.init({})).rejects.toBeInstanceOf(HttpBackendError);
  });
});
