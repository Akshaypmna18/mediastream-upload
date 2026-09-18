# Sample upload backend (Tier A)

Minimal **Node + Express** server that implements
[`docs/backend-contract.md`](../../docs/backend-contract.md) on the local
filesystem. No Cloudflare account, R2, or AWS required.

Use it with the vanilla / React demos via `createR2Backend` (same HTTP wire):

```text
?backend=http://127.0.0.1:8787
```

## What this sample teaches (copy these patterns)

| Behavior | Implemented |
|----------|-------------|
| `POST /uploads` init → `{ uploadId }` | ✅ |
| `PUT …/chunks/:seq` + `X-Checksum-SHA256` | ✅ |
| Idempotent PUT (same checksum) | ✅ |
| Part 0 `replace` (`?replace=1` / `X-Replace-Part`) | ✅ |
| Finalize gap-check `0 … totalChunks-1` | ✅ |
| Reject `totalChunks < 1` | ✅ |
| Non-final parts ≥ **5 MiB** (S3/R2 rule) | ✅ (checked on finalize) |
| Final part may be undersized | ✅ |
| `GET /uploads/:id` with **Range → 206** | ✅ |
| Status model: `active` → `completed` \| `aborted` | ✅ |
| CORS for local Vite / `serve` demos | ✅ |

**Normal End seekability** is mostly **client-side** (patched Part 0 + Cues).
This server stores parts correctly and serves the object with Range — enough
for scrub-to-work after a clean **Stop**.

## Run

From the **repo root** (workspace):

```bash
pnpm install
pnpm example:backend
# → http://127.0.0.1:8787
```

Or:

```bash
pnpm --dir examples/backend install
pnpm --dir examples/backend dev
```

Env (optional): `PORT` (default `8787`), `HOST`, `PUBLIC_BASE_URL`
(absolute origin used in `videoUrl`).

## Wire to frontend examples

```bash
# terminal 1
pnpm example:backend

# terminal 2 — after `pnpm build` at repo root
pnpm dlx serve .
# open http://localhost:3000/examples/vanilla-js/?backend=http://127.0.0.1:8787

# or React
pnpm example:react
# open http://localhost:5173/?backend=http://127.0.0.1:8787
```

## curl smoke

```bash
BASE=http://127.0.0.1:8787

# init
UPLOAD=$(curl -s -X POST "$BASE/uploads" -H 'Content-Type: application/json' \
  -d '{"contentType":"video/webm"}')
echo "$UPLOAD"
ID=$(node -e "console.log(JSON.parse(process.argv[1]).uploadId)" "$UPLOAD")

# one short “final” part (< 5 MiB is OK when totalChunks === 1)
printf 'fake-webm-bytes' > /tmp/part0.bin
SUM=$(sha256sum /tmp/part0.bin | awk '{print $1}')
curl -s -o /dev/null -w "%{http_code}\n" -X PUT "$BASE/uploads/$ID/chunks/0" \
  -H "Content-Type: application/octet-stream" \
  -H "X-Checksum-SHA256: $SUM" \
  --data-binary @/tmp/part0.bin

# finalize
curl -s -X POST "$BASE/uploads/$ID/finalize" -H 'Content-Type: application/json' \
  -d '{"totalChunks":1,"abrupt":false}'

# Range
curl -s -D - -o /dev/null -H 'Range: bytes=0-3' "$BASE/uploads/$ID" | head -n 15
```

Expect finalize → `{ videoUrl, seekRepairStatus: "none" }` and Range → **206**.

## Demo vs production

| Topic | This sample | Production |
|-------|-------------|------------|
| Storage | `./data/` on disk | S3 / R2 multipart (`CreateMultipartUpload` …) |
| Auth / rate limits | None | Required |
| Abrupt (Track B) seek repair | Stub: `seekRepairStatus: "skipped"` | Async job + `repairAbruptWebmSeekability` |
| Part tracking | In-memory map + files | Strongly consistent store (ETags) |

### Production: abrupt seek repair

On `finalize({ abrupt: true })` the client may **not** rewrite Part 0.
Do **not** block the finalize HTTP response on repair.

1. Complete/seal storage with acknowledged parts only.
2. Return `{ videoUrl, abrupt: true, seekRepairStatus: "pending" }` (or `"skipped"` if too large).
3. Background job: read bytes → `repairAbruptWebmSeekability` from `mediastream-upload` → write `*.seekable.webm` → set status `"done"`.
4. Playback prefers the repaired object when status is `"done"`.

See contract [§5 Abrupt Seek Repair](../../docs/backend-contract.md#5-abrupt-seek-repair-track-b) and the sketch in [`src/abruptRepair.example.ts`](./src/abruptRepair.example.ts) (not imported by the server).
