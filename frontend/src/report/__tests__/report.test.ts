import { describe, expect, it } from 'vitest';
import { EXAMPLE_WORKFLOW } from '../../scanner/example';
import { scan } from '../../scanner/scan';
import type { Finding, Severity } from '../../scanner/types';
import { gradeFindings } from '../grade';
import { reportToMarkdown } from '../markdown';

const f = (severity: Severity, extra: Partial<Finding> = {}): Finding => ({
  ruleId: 'unpinned-action',
  severity,
  title: `${severity} finding`,
  message: 'msg',
  why: 'why',
  line: 1,
  column: 1,
  endLine: 1,
  endColumn: 2,
  offset: 0,
  endOffset: 1,
  ...extra,
});

describe('gradeFindings', () => {
  it.each([
    [[], 'A', 100],
    [['low', 'low', 'medium'], 'A', 93],
    [['high'], 'B', 85],
    [['high', 'medium', 'medium'], 'C', 75],
    [['critical'], 'D', 60],
    [['critical', 'low'], 'F', 59],
    [['critical', 'critical', 'critical'], 'F', 0],
  ] as [Severity[], string, number][])('%j → %s (%i)', (severities, grade, score) => {
    const result = gradeFindings(severities.map((s) => f(s)));
    expect(result.grade).toBe(grade);
    expect(result.score).toBe(score);
    expect(result.total).toBe(severities.length);
  });

  it('counts per severity', () => {
    expect(gradeFindings([f('high'), f('high'), f('low')]).counts).toEqual({ critical: 0, high: 2, medium: 0, low: 1 });
  });
});

describe('reportToMarkdown', () => {
  it('includes grade, counts, each finding and fix snippets', () => {
    const findings = [f('critical', { fix: 'uses: a/b@sha # v1', line: 7 })];
    const md = reportToMarkdown(findings, gradeFindings(findings), 'ci.yml');
    expect(md).toContain('## GitHub Actions security report: `ci.yml`');
    expect(md).toContain('**Grade: D** (60/100) · 1 finding');
    expect(md).toContain('| Critical | 1 |');
    expect(md).toContain('### 1. [CRITICAL] critical finding');
    expect(md).toContain('- **Line:** 7');
    expect(md).toContain('https://secureyourgit.com/rules/unpinned-action/');
    expect(md).toContain('```yaml\nuses: a/b@sha # v1\n```');
  });

  it('uses a longer fence when the snippet contains backticks', () => {
    const findings = [f('low', { fix: 'script: |\n  const x = `${y}`;\n  ```' })];
    expect(reportToMarkdown(findings, gradeFindings(findings))).toContain('````yaml\n');
  });

  it('never includes the scanned workflow source', () => {
    const { findings } = scan(EXAMPLE_WORKFLOW);
    const md = reportToMarkdown(findings, gradeFindings(findings));
    expect(md).not.toContain('Deliberately insecure example');
    expect(md).not.toContain('npm ci && npm test');
  });

  it('reports a clean scan', () => {
    expect(reportToMarkdown([], gradeFindings([]))).toContain('No issues found.');
  });
});
