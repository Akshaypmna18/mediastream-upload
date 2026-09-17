import { afterEach, describe, expect, it, vi } from "vitest";
import { createR2Backend } from "../../adapters/r2";
import { createS3Backend } from "../../adapters/s3";

describe("createS3Backend", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the same wire paths as the R2 adapter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ uploadId: "s3-1" }), { status: 201 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ videoUrl: "https://api.example.com/uploads/s3-1" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const backend = createS3Backend("https://api.example.com/api/v1", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    await backend.init({ contentType: "video/webm" });
    await backend.sendChunk("s3-1", 1, "abc", new Blob([new Uint8Array(4)]));
    await backend.finalize("s3-1", 2);
    await backend.abort("s3-1", "cancel");

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls).toEqual([
      "https://api.example.com/api/v1/uploads",
      "https://api.example.com/api/v1/uploads/s3-1/chunks/1",
      "https://api.example.com/api/v1/uploads/s3-1/finalize",
      "https://api.example.com/api/v1/uploads/s3-1/abort",
    ]);
  });

  it("is interchangeable with createR2Backend for the same base URL", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ uploadId: "x" }), { status: 201 }),
        ),
      );

    const r2 = createR2Backend("https://same.example.com", {
      fetch: fetchMock as unknown as typeof fetch,
    });
    const s3 = createS3Backend("https://same.example.com", {
      fetch: fetchMock as unknown as typeof fetch,
    });

    await r2.init({});
    await s3.init({});

    expect(fetchMock.mock.calls[0]?.[0]).toBe(fetchMock.mock.calls[1]?.[0]);
  });
});
