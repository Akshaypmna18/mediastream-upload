export function ApiPage() {
  return (
    <article className="prose">
      <h1>API</h1>
      <p className="lead">
        Public surface of <code>mediastream-upload</code>. Adapters are separate
        entry points.
      </p>

      <h2>Imports</h2>
      <pre>{`import {
  ChunkRecorder,
  UnsupportedBrowserError,
  SourceInitializationError,
} from "mediastream-upload";

import { createR2Backend } from "mediastream-upload/adapters/r2";
import { createS3Backend } from "mediastream-upload/adapters/s3";`}</pre>

      <h2>
        <code>ChunkRecorder</code>
      </h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>start(args)</code>
              </td>
              <td>Init backend + media; enter recording</td>
            </tr>
            <tr>
              <td>
                <code>stop()</code>
              </td>
              <td>
                Flush, seek-patch, finalize →{" "}
                <code>{`{ videoUrl, localBlob }`}</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>destroy()</code>
              </td>
              <td>Tear down; abort if needed</td>
            </tr>
            <tr>
              <td>
                <code>getState()</code>
              </td>
              <td>Current state string</td>
            </tr>
            <tr>
              <td>
                <code>getEmergencyBlob()</code>
              </td>
              <td>Local bytes after mid-session failure</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Start options (common)</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>canvasWidth</code> / <code>canvasHeight</code>
              </td>
              <td>1280 × 720</td>
            </tr>
            <tr>
              <td>
                <code>fps</code>
              </td>
              <td>30</td>
            </tr>
            <tr>
              <td>
                <code>pipWidth</code> / <code>pipHeight</code> /{" "}
                <code>pipMargin</code>
              </td>
              <td>320 / 180 / 12</td>
            </tr>
            <tr>
              <td>
                <code>pipPosition</code>
              </td>
              <td>
                <code>top-left</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>videoBitsPerSecond</code> /{" "}
                <code>audioBitsPerSecond</code>
              </td>
              <td>2_500_000 / 128_000</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>State machine</h2>
      <pre>{`idle → initializing → recording → degraded → backpressured
                              ↓
                        finalizing → completed | failed | cancelled`}</pre>
      <p>
        Buffer pressure: ≥15&nbsp;MiB → <code>degraded</code>; ≥50&nbsp;MiB →{" "}
        <code>backpressured</code> (capture pauses).
      </p>

      <h2>Typed errors</h2>
      <p>
        Prefer <code>instanceof</code>:{" "}
        <code>UnsupportedBrowserError</code>,{" "}
        <code>SourceInitializationError</code>,{" "}
        <code>Chunk0FatalError</code>, <code>ChunkUploadError</code>,{" "}
        <code>FinalizeError</code>, <code>BackpressureOverflowError</code>.
      </p>

      <h2>Also exported</h2>
      <p>
        Seek helpers such as <code>repairAbruptWebmSeekability</code> for
        backend parity on abrupt finalize.
      </p>
    </article>
  );
}
