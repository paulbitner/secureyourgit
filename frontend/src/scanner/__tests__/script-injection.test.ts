import { describe, expect, it } from 'vitest';
import { envVarName } from '../rules/script-injection';
import { fixture, lineOf, runRule } from './helpers';

const RULE = 'script-injection';

describe(RULE, () => {
  it('pinpoints the expression inside a multi-line run block', () => {
    const src = fixture(`${RULE}/issue-title-multiline.yml`);
    const findings = runRule(RULE, src);
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.severity).toBe('critical');
    expect(f.line).toBe(11);
    expect(lineOf(src, f).slice(f.column - 1, f.endColumn - 1)).toBe('${{ github.event.issue.title }}');
  });

  it('suggests an env-var fix that references "$VAR"', () => {
    const f = runRule(RULE, fixture(`${RULE}/issue-title-multiline.yml`))[0]!;
    expect(f.fix).toBe(
      'env:\n  ISSUE_TITLE: ${{ github.event.issue.title }}\nrun: |\n  echo "Title: $ISSUE_TITLE"',
    );
  });

  it('is high (not critical) on unprivileged triggers and quotes the variable', () => {
    const f = runRule(RULE, fixture(`${RULE}/head-ref-inline.yml`))[0]!;
    expect(f.severity).toBe('high');
    expect(f.fix).toContain('git checkout "$HEAD_REF"');
  });

  it('flags actions/github-script and suggests process.env', () => {
    const src = fixture(`${RULE}/github-script.yml`);
    const f = runRule(RULE, src)[0]!;
    expect(f.line).toBe(9);
    expect(f.severity).toBe('critical');
    expect(f.fix).toContain('const body = process.env.COMMENT_BODY;');
  });

  it('understands bracket notation, array indexes, toJSON and quoting styles', () => {
    const src = fixture(`${RULE}/variants.yml`);
    const findings = runRule(RULE, src);
    expect(findings.map((f) => f.line)).toEqual([6, 7, 8, 10, 11, 12]);
    for (const f of findings) expect(lineOf(src, f).slice(f.column - 1, f.endColumn - 1)).toMatch(/^\$\{\{.*\}\}$/);
  });

  it('ignores env-var usage, trusted contexts, YAML comments and action inputs', () => {
    expect(runRule(RULE, fixture(`${RULE}/safe.yml`))).toEqual([]);
  });

  it('reports an anchored composite step once', () => {
    const findings = runRule(RULE, fixture(`${RULE}/anchors-composite.yml`));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(6);
  });

  it('derives readable env var names', () => {
    expect(envVarName('github.event.issue.title')).toBe('ISSUE_TITLE');
    expect(envVarName('github.head_ref')).toBe('HEAD_REF');
    expect(envVarName('github.event.commits.*.message')).toBe('COMMITS_MESSAGE');
    expect(envVarName('github.event')).toBe('EVENT_DATA');
  });
});
