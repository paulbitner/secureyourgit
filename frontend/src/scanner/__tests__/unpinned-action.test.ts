import { describe, expect, it } from 'vitest';
import { fixture, lineOf, runRule } from './helpers';

const RULE = 'unpinned-action';

describe(RULE, () => {
  it('flags tags, branches, short SHAs and missing refs with owner-based severity', () => {
    const src = fixture(`${RULE}/vulnerable.yml`);
    const findings = runRule(RULE, src);
    const byName = Object.fromEntries(findings.map((f) => [f.data?.name, f]));

    expect(findings).toHaveLength(7);
    expect(byName['some-org/setup-thing']?.severity).toBe('high');
    expect(byName['actions/checkout']?.severity).toBe('medium');
    expect(byName['github/codeql-action/init']?.severity).toBe('medium');
    expect(byName['some-org/no-ref']?.message).toMatch(/no version/);
    expect(byName['some-org/short-sha']?.message).toMatch(/short SHA/);
    expect(byName['some-org/other']?.data?.ref).toBe('main');
    expect(byName['some-org/workflows/.github/workflows/ci.yml']?.title).toMatch(/^Reusable workflow/);
  });

  it('reports exact line and column of the uses value', () => {
    const src = fixture(`${RULE}/vulnerable.yml`);
    const f = runRule(RULE, src).find((x) => x.data?.name === 'actions/checkout')!;
    expect(f.line).toBe(7);
    expect(f.column).toBe(15);
    expect(lineOf(src, f).slice(f.column - 1, f.endColumn - 1)).toBe('actions/checkout@v4');
  });

  it('includes fixer data and a pinned fix snippet', () => {
    const f = runRule(RULE, fixture(`${RULE}/vulnerable.yml`)).find((x) => x.data?.name === 'actions/checkout')!;
    expect(f.data).toMatchObject({ owner: 'actions', repo: 'checkout', path: '', ref: 'v4' });
    expect(f.fix).toBe('uses: actions/checkout@<40-char-commit-sha> # v4');
  });

  it('accepts full SHAs, local actions, local reusable workflows and docker digests', () => {
    expect(runRule(RULE, fixture(`${RULE}/safe.yml`))).toEqual([]);
  });

  it('flags docker images without a digest as low severity', () => {
    const findings = runRule(RULE, fixture(`${RULE}/docker.yml`));
    expect(findings.map((f) => f.severity)).toEqual(['low', 'low']);
    expect(findings[0]?.fix).toContain('docker://hadolint/hadolint:latest@sha256:');
  });

  it('reports an anchored step once even when aliased or merged into several jobs', () => {
    const src = fixture(`${RULE}/anchors.yml`);
    const findings = runRule(RULE, src);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);
  });

  it('scans composite action steps', () => {
    const findings = runRule(RULE, fixture(`${RULE}/composite-action.yml`));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.data?.name).toBe('some-org/cache-thing');
    expect(findings[0]?.message).toContain('(composite action)');
  });

  it('handles matrix jobs and ignores commented-out steps', () => {
    const findings = runRule(RULE, fixture(`${RULE}/matrix-comments.yml`));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.data?.name).toBe('actions/setup-node');
    expect(findings[0]?.line).toBe(11);
  });
});
