import type { GradeResult } from '../report/grade';
import { GRADE_THRESHOLDS, SEVERITY_WEIGHTS } from '../report/grade';
import { SEVERITY_ORDER, type Severity } from '../scanner/types';

const GRADE_TILE: Record<GradeResult['grade'], string> = {
  A: 'bg-success-subtle text-success',
  B: 'bg-success-subtle text-success',
  C: 'bg-warning-subtle text-warning',
  D: 'bg-accent/15 text-accent',
  F: 'bg-danger-subtle text-danger',
};

const BAR_FILL: Record<Severity, string> = {
  critical: 'fill-danger',
  high: 'fill-accent',
  medium: 'fill-warning',
  low: 'fill-info',
};

export function GradeCard({ grade }: { grade: GradeResult | null }) {
  const maxCount = Math.max(1, ...SEVERITY_ORDER.map((s) => grade?.counts[s] ?? 0));
  return (
    <section aria-labelledby="grade-heading">
      <h2 id="grade-heading" className="text-h3">
        Grade
      </h2>
      <div className="mt-4 flex items-center gap-5" aria-live="polite">
        <span
          className={`inline-flex h-24 w-24 shrink-0 items-center justify-center rounded-lg text-grade ${grade ? GRADE_TILE[grade.grade] : 'bg-surface-2 text-fg-muted'}`}
          aria-hidden
        >
          {grade?.grade ?? '–'}
        </span>
        {grade ? (
          <p>
            <span className="sr-only">Grade {grade.grade}. </span>
            <span className="block text-h3">{grade.score} / 100</span>
            <span className="text-sm text-fg-muted">
              {grade.total} finding{grade.total === 1 ? '' : 's'}
            </span>
          </p>
        ) : (
          <p className="text-sm text-fg-muted">Paste a workflow to get a grade.</p>
        )}
      </div>

      <ul className="mt-6 space-y-3" aria-label="Findings by severity">
        {SEVERITY_ORDER.map((s) => {
          const count = grade?.counts[s] ?? 0;
          return (
            <li key={s} className="flex items-center gap-3 text-ui">
              <span className="w-20 capitalize text-primary">{s}</span>
              {/* SVG width attributes, not inline styles, so the page needs no 'unsafe-inline' styles. */}
              <svg className="h-6 flex-1 fill-surface-2" aria-hidden preserveAspectRatio="none">
                <rect width="100%" height="100%" />
                <rect width={`${(count / maxCount) * 100}%`} height="100%" className={BAR_FILL[s]} />
              </svg>
              <span className="w-8 text-right">{count}</span>
            </li>
          );
        })}
      </ul>

      <details className="mt-6 text-sm">
        <summary className="cursor-pointer text-primary underline underline-offset-2">How is the grade calculated?</summary>
        <div className="mt-3 space-y-2 text-fg-muted">
          <p>
            Score = 100 −{' '}
            {SEVERITY_ORDER.map((s) => `${SEVERITY_WEIGHTS[s]} × ${s}`).join(' − ')}, minimum 0.
          </p>
          <p>
            {GRADE_THRESHOLDS.slice(0, -1)
              .map(([g, min]) => `${g} ≥ ${min}`)
              .join(' · ')}{' '}
            · F below {GRADE_THRESHOLDS.at(-2)![1]}.
          </p>
          <p>One critical finding caps the grade at D; two make it F.</p>
        </div>
      </details>
    </section>
  );
}
