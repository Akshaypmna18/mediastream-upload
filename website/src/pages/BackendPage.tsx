import { Link } from "react-router-dom";

export function BackendPage() {
  return (
    <article className="prose">
      <h1>Backend</h1>
      <p className="lead">
        The library never talks to object storage. You implement four methods
        (or use the shipped HTTP adapters against your API).
      </p>

      <h2>Contract</h2>
      <pre>{`init(metadata) → { uploadId }

sendChunk(uploadId, sequenceNumber, checksum, bytes, options?) → void
  options.replace?: boolean   # Part 0 same-size rewrite

finalize(uploadId, totalChunks, options?) → { videoUrl, abrupt?, seekRepairStatus? }
  options.abrupt?: boolean

abort(uploadId, reason) → void`}</pre>

      <h2>Suggested HTTP wire</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>POST</td>
              <td>
                <code>/uploads</code>
              </td>
            </tr>
            <tr>
              <td>PUT</td>
              <td>
                <code>/uploads/:id/chunks/:seq</code>
              </td>
            </tr>
            <tr>
              <td>POST</td>
              <td>
                <code>/uploads/:id/finalize</code>
              </td>
            </tr>
            <tr>
              <td>POST</td>
              <td>
                <code>/uploads/:id/abort</code>
              </td>
            </tr>
            <tr>
              <td>GET</td>
              <td>
                <code>/uploads/:id</code> (Range / 206)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Must get right</h2>
      <ul>
        <li>Checksum + idempotent PUT; Part 0 <code>replace</code></li>
        <li>Finalize gap-check <code>0 … totalChunks - 1</code></li>
        <li>Non-final parts ≥ 5&nbsp;MiB (S3/R2 rule)</li>
        <li>Playback with HTTP Range</li>
        <li>Reject <code>totalChunks &lt; 1</code></li>
      </ul>

      <h2>Adapters</h2>
      <pre>{`import { createR2Backend } from "mediastream-upload/adapters/r2";
import { createS3Backend } from "mediastream-upload/adapters/s3";

createR2Backend("https://your-worker.example.com");
createS3Backend("https://api.example.com/api/v1");`}</pre>

      <h2>Local sample server</h2>
      <p>
        The repo ships a Tier A Express sample under{" "}
        <code>examples/backend/</code> — disk storage, CORS, Range, no cloud
        account.
      </p>
      <pre>{`pnpm example:backend
# → http://127.0.0.1:8787

# then open the demo with:
# ?backend=http://127.0.0.1:8787`}</pre>

      <h2>Production: abrupt seek repair</h2>
      <p>
        Normal End seekability is mostly client-side (patched Part 0 + Cues).
        On abrupt finalize, return quickly with{" "}
        <code>seekRepairStatus: &quot;pending&quot;</code> (or{" "}
        <code>&quot;skipped&quot;</code>), then async-run{" "}
        <code>repairAbruptWebmSeekability</code> from the package and prefer
        the repaired object for playback.
      </p>

      <div className="cta-row">
        <Link className="btn btn-primary" to="/examples/react">
          Try demo (mock backend)
        </Link>
        <a
          className="btn"
          href="https://github.com/akshaypmna18/mediastream-upload/tree/main/examples/backend"
          target="_blank"
          rel="noreferrer"
        >
          Sample backend on GitHub
        </a>
      </div>
    </article>
  );
}
