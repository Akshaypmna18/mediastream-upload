import type { Request, Response } from "express";
import { createReadStream, statSync } from "node:fs";

/**
 * Serve a file with HTTP Range support (`206` + `Accept-Ranges: bytes`).
 */
export function sendFileWithRange(
  req: Request,
  res: Response,
  filePath: string,
  contentType: string,
): void {
  const { size } = statSync(filePath);
  const rangeHeader = req.headers.range;

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", contentType);

  if (!rangeHeader) {
    res.setHeader("Content-Length", size);
    res.status(200);
    createReadStream(filePath).pipe(res);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
    return;
  }

  const start = match[1] === "" ? 0 : Number(match[1]);
  const end = match[2] === "" ? size - 1 : Number(match[2]);

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start < 0 ||
    end >= size ||
    start > end
  ) {
    res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
    return;
  }

  const chunkSize = end - start + 1;
  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
  res.setHeader("Content-Length", chunkSize);
  createReadStream(filePath, { start, end }).pipe(res);
}
