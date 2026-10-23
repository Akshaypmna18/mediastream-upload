import { useState, type ReactNode } from "react";

export function DocsCodeBlock({
  code,
  language,
  label,
  copyLabel,
  lineNumbers = true,
  align = "start",
}: {
  code: string;
  language: "shell" | "typescript" | "text";
  label: string;
  copyLabel?: string;
  lineNumbers?: boolean;
  align?: "start" | "center";
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const lines = code.split("\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  return (
    <div className={align === "center" ? "docs-code is-centered" : "docs-code"}>
      <div className="docs-code-toolbar">
        <span className="docs-code-badge">{label}</span>
        <button
          type="button"
          className="docs-code-copy"
          onClick={copy}
          aria-label={
            copyState === "copied"
              ? "Copied"
              : copyState === "error"
                ? "Copy failed"
                : (copyLabel ?? `Copy ${label} example`)
          }
        >
          {copyState === "copied" ? <CheckIcon /> : <CopyIcon />}
          {copyState === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="docs-code-view">
        <pre>
          {lines.map((line, index) => (
            <span className="docs-code-line" key={index}>
              {lineNumbers && (
                <span className="docs-code-n" aria-hidden="true">
                  {index + 1}
                </span>
              )}
              <code>{highlightLine(line, language)}</code>
            </span>
          ))}
        </pre>
      </div>
      <span className="visually-hidden" aria-live="polite">
        {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : ""}
      </span>
    </div>
  );
}

function highlightLine(line: string, language: "shell" | "typescript" | "text"): ReactNode {
  if (language === "text") return line;

  const trimmed = line.trimStart();
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("#")
  ) {
    return <span className="tok-c">{line}</span>;
  }

  if (language === "shell") {
    return line.split(/(\s+)/).map((token, index) => {
      if (!token.trim()) return token;
      if (index === 0) return <span className="tok-f" key={index}>{token}</span>;
      if (token === "add") return <span className="tok-k" key={index}>{token}</span>;
      return token;
    });
  }

  const commentAt = inlineCommentIndex(line);
  const code = commentAt === -1 ? line : line.slice(0, commentAt);
  const comment = commentAt === -1 ? "" : line.slice(commentAt);
  const tokens = code.split(/("(?:[^"\\]|\\.)*"|[A-Za-z_][\w]*|\s+|.)/g).filter(Boolean);
  const highlighted = tokens.map((token, index) => {
    if (token.startsWith('"')) return <span className="tok-s" key={index}>{token}</span>;
    if (/^\d+$/.test(token)) return <span className="tok-num" key={index}>{token}</span>;
    if (/^(import|from|const|await|new|true|false|try|catch|if|instanceof|throw)$/.test(token)) {
      return <span className="tok-k" key={index}>{token}</span>;
    }
    if (/^(ChunkRecorder|UnsupportedBrowserError|SourceInitializationError|boolean|void)$/.test(token)) {
      return <span className="tok-t" key={index}>{token}</span>;
    }
    if (/^(createR2Backend|createS3Backend|getUserMedia|start|stop|init|sendChunk|finalize|abort)$/.test(token)) {
      return <span className="tok-f" key={index}>{token}</span>;
    }
    if (token === "=>" || token === "→") return <span className="tok-o" key={index}>{token}</span>;
    const next = tokens.slice(index + 1).find((part) => part.trim());
    if (/^[A-Za-z_][\w]*$/.test(token) && next === "?") {
      return <span className="tok-t" key={index}>{token}</span>;
    }
    if (/^[A-Za-z_][\w]*$/.test(token) && next === ":") {
      return <span className="tok-p" key={index}>{token}</span>;
    }
    if (/^[A-Za-z_][\w]*$/.test(token) && (next === "," || next === ")" || next === "}" || next === ".")) {
      return <span className="tok-p" key={index}>{token}</span>;
    }
    return token;
  });

  if (!comment) return highlighted;
  return (
    <>
      {highlighted}
      <span className="tok-c">{comment}</span>
    </>
  );
}

function inlineCommentIndex(line: string): number {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i - 1] !== "\\") inString = !inString;
    if (inString) continue;
    if (char === "/" && line[i + 1] === "/") return i;
    if (char === "#" && (i === 0 || /\s/.test(line[i - 1]))) return i;
  }
  return -1;
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      className="docs-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function CopyIcon() {
  return (
    <Glyph>
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </Glyph>
  );
}

function CheckIcon() {
  return (
    <Glyph>
      <path d="M20 6 9 17l-5-5" />
    </Glyph>
  );
}
