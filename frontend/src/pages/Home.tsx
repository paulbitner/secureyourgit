import { ChevronsDownUp, ChevronsUpDown, FileCode2, FileText, Lock, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CopyButton } from '../components/CopyButton';
import { FindingCard } from '../components/FindingCard';
import { GradeCard } from '../components/GradeCard';
import { Seo } from '../components/Seo';
import { SubHeader } from '../components/SubHeader';
import { WorkflowEditor, type WorkflowEditorHandle } from '../components/WorkflowEditor';
import { site } from '../config/site';
import { gradeFindings } from '../report/grade';
import { reportToMarkdown } from '../report/markdown';
import { EXAMPLE_WORKFLOW } from '../scanner/example';
import { byteLength, scan, type ScanResult } from '../scanner/scan';
import type { Finding } from '../scanner/types';

const SCAN_DEBOUNCE_MS = 200;
const EMPTY: ScanResult = { findings: [], parseErrors: [], kind: 'unknown', tooLarge: false };

const findingKey = (f: Finding) => `${f.ruleId}-${f.offset}-${f.title}`;

function formatKb(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: site.name,
  url: `${site.url}/`,
  description: site.tagline,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any (runs in the browser)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function Home() {
  const [source, setSource] = useState('');
  const [scanned, setScanned] = useState<{ source: string; result: ScanResult }>({ source: '', result: EMPTY });
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const editor = useRef<WorkflowEditorHandle>(null);
  const size = byteLength(source);
  const isBlank = !source.trim();
  const result = isBlank ? EMPTY : scanned.result;
  const hasReport = !isBlank && !result.tooLarge && result.parseErrors.length === 0;
  const grade = useMemo(() => (hasReport ? gradeFindings(result.findings) : null), [hasReport, result.findings]);
  const allCollapsed = result.findings.length > 0 && result.findings.every((f) => collapsed.has(findingKey(f)));

  useEffect(() => {
    const id = setTimeout(() => setScanned({ source, result: scan(source) }), SCAN_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [source]);

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(result.findings.map(findingKey)));

  return (
    <>
      <Seo
        title={`${site.name}: GitHub Actions Security Scanner`}
        description={`${site.tagline} Free, private, and runs entirely in your browser. Get a grade, plain-English explanations, and fixes.`}
        path="/"
        jsonLd={JSON_LD}
      />

      <SubHeader crumbs={[{ label: 'Workflow Scanner' }]}>
        <a href="#how-it-works" className="hover:text-chrome-muted">
          How it works
        </a>
      </SubHeader>

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
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <h2 id="findings-heading">Findings</h2>
                {hasReport && (
                  <div className="flex flex-wrap items-center gap-2">
                    {result.findings.length > 0 && (
                      <button type="button" className="btn-ghost" onClick={toggleAll}>
                        {allCollapsed ? <ChevronsUpDown size={18} aria-hidden /> : <ChevronsDownUp size={18} aria-hidden />}
                        {allCollapsed ? 'Expand all' : 'Collapse all'}
                      </button>
                    )}
                    <CopyButton
                      text={() => reportToMarkdown(result.findings, grade!)}
                      label="Copy report as Markdown"
                      className="btn-secondary"
                      showLabel
                    />
                  </div>
                )}
              </div>
              <div aria-live="polite">
                {result.parseErrors.length > 0 && (
                  <p className="mt-4 text-danger">
                    YAML error on line {result.parseErrors[0]!.line}: {result.parseErrors[0]!.message}
                  </p>
                )}
                {isBlank && (
                  <p className="mt-4 inline-flex items-center gap-2 text-fg-muted">
                    <FileText size={18} aria-hidden />
                    Paste a workflow or load the example to start.
                  </p>
                )}
                {hasReport && result.findings.length === 0 && (
                  <p className="mt-4">
                    <span className="badge-success">No issues found</span>{' '}
                    {result.kind === 'unknown' && (
                      <span className="text-sm text-fg-muted">
                        This doesn’t look like a workflow or composite action, so there was nothing to check.
                      </span>
                    )}
                  </p>
                )}
              </div>
              <ul>
                {result.findings.map((f) => {
                  const key = findingKey(f);
                  return (
                    <FindingCard
                      key={key}
                      finding={f}
                      expanded={!collapsed.has(key)}
                      onToggle={() => toggle(key)}
                      onReveal={() => editor.current?.reveal(f)}
                    />
                  );
                })}
              </ul>
            </section>
          </section>

          <aside aria-label="Scan summary" className="space-y-12">
            <GradeCard grade={grade} />
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
