import { CornerDownRight, FileCode2, Lock, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Head } from 'vite-react-ssg';
import { SeverityBadge } from '../components/SeverityBadge';
import { WorkflowEditor, type WorkflowEditorHandle } from '../components/WorkflowEditor';
import { site } from '../config/site';
import { EXAMPLE_WORKFLOW } from '../scanner/example';
import { byteLength, scan, type ScanResult } from '../scanner/scan';
import { SEVERITY_ORDER } from '../scanner/types';

const SCAN_DEBOUNCE_MS = 200;
const EMPTY: ScanResult = { findings: [], parseErrors: [], kind: 'unknown', tooLarge: false };

const BAR_FILL: Record<string, string> = {
  critical: 'bg-danger',
  high: 'bg-accent',
  medium: 'bg-warning',
  low: 'bg-info',
};

function formatKb(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function Home() {
  const [source, setSource] = useState('');
  const [scanned, setScanned] = useState<{ source: string; result: ScanResult }>({ source: '', result: EMPTY });
  const editor = useRef<WorkflowEditorHandle>(null);
  const size = byteLength(source);
  const isBlank = !source.trim();
  const result = isBlank ? EMPTY : scanned.result;

  useEffect(() => {
    const id = setTimeout(() => setScanned({ source, result: scan(source) }), SCAN_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [source]);

  const counts = Object.fromEntries(
    SEVERITY_ORDER.map((s) => [s, result.findings.filter((f) => f.severity === s).length]),
  );
  const maxCount = Math.max(1, ...Object.values(counts));

  return (
    <>
      <Head>
        <title>{`${site.name} — ${site.tagline}`}</title>
        <meta name="description" content={`${site.tagline} Free, private, runs entirely in your browser.`} />
        <link rel="canonical" href={`${site.url}/`} />
      </Head>

      <div className="bg-chrome text-chrome-fg">
        <div className="container-content flex h-subheader items-center justify-between border-t border-chrome-2">
          <span className="text-ui">Workflow Scanner</span>
          <a href="#how-it-works" className="text-ui hover:text-chrome-muted">
            How it works
          </a>
        </div>
      </div>

      <div className="container-content pt-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-fg sm:h-28 sm:w-28">
            <FileCode2 size={48} aria-hidden />
          </span>
          <div>
            <h1>{site.tagline}</h1>
            <p id="privacy-note" className="mt-2 inline-flex items-center gap-2 text-ui font-semibold text-success">
              <Lock size={18} aria-hidden />
              Your code never leaves your browser.
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-16 lg:grid-cols-main-sidebar">
          <section aria-labelledby="editor-heading" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="editor-heading" className="text-h3">
                Paste a workflow
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn-secondary" onClick={() => setSource(EXAMPLE_WORKFLOW)}>
                  Load example
                </button>
                <button type="button" className="btn-ghost" onClick={() => setSource('')} disabled={!source}>
                  <Trash2 size={18} aria-hidden />
                  Clear
                </button>
              </div>
            </div>
            <WorkflowEditor
              ref={editor}
              value={source}
              onChange={setSource}
              findings={result.findings}
              findingsSource={isBlank ? source : scanned.source}
              describedBy="privacy-note size-note"
            />
            <p
              id="size-note"
              className={`mt-2 text-sm ${result.tooLarge ? 'text-danger' : 'text-fg-muted'}`}
              aria-live="polite"
            >
              {formatKb(size)} of {formatKb(site.maxInputBytes)} max
              {result.tooLarge && ' — this file is too large to scan.'}
            </p>

            <section aria-labelledby="findings-heading" className="mt-12">
              <h2 id="findings-heading">Findings</h2>
              <div aria-live="polite">
                {result.parseErrors.length > 0 && (
                  <p className="mt-4 text-danger">
                    YAML error on line {result.parseErrors[0]!.line}: {result.parseErrors[0]!.message}
                  </p>
                )}
                {!source.trim() && <p className="mt-4 text-fg-muted">Paste a workflow or load the example to start.</p>}
                {source.trim() && !result.parseErrors.length && !result.tooLarge && result.findings.length === 0 && (
                  <p className="mt-4">
                    <span className="badge-success">No issues found</span>
                  </p>
                )}
                <ul className="mt-4">
                  {result.findings.map((f) => (
                    <li key={`${f.ruleId}-${f.offset}-${f.title}`} className="border-b border-border py-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <SeverityBadge severity={f.severity} />
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm link"
                          onClick={() => editor.current?.reveal(f)}
                          aria-label={`Show line ${f.line} in the editor`}
                        >
                          <CornerDownRight size={14} aria-hidden />
                          Line {f.line}
                        </button>
                      </div>
                      <h3 className="mt-2 text-lead">
                        <button
                          type="button"
                          className="text-left hover:text-primary"
                          onClick={() => editor.current?.reveal(f)}
                        >
                          {f.title}
                        </button>
                      </h3>
                      <p className="mt-1">{f.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </section>

          <aside aria-label="Scan summary" className="space-y-12">
            <section>
              <h2 className="text-h3">Summary</h2>
              <ul className="mt-4 space-y-3">
                {SEVERITY_ORDER.map((s) => (
                  <li key={s} className="flex items-center gap-3 text-ui">
                    <span className="w-20 capitalize text-primary">{s}</span>
                    <span className="h-6 flex-1 bg-surface-2" aria-hidden>
                      <span
                        className={`block h-full ${BAR_FILL[s]}`}
                        style={{ width: `${(counts[s]! / maxCount) * 100}%` }}
                      />
                    </span>
                    <span className="w-8 text-right">{counts[s]}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section id="how-it-works">
              <h2 className="text-h3">How it works</h2>
              <p className="mt-3 text-sm text-fg-muted">
                Your workflow is parsed and checked by JavaScript running in this tab. Nothing is uploaded, logged or stored.
                You can disconnect from the internet after the page loads and the scanner still works.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
