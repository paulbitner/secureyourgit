import { describe, expect, it } from 'vitest';
import { fixture, lineOf, runRule } from './helpers';

const RULE = 'secrets-exposure';

describe(RULE, () => {
  it('flags secrets echoed directly or via workflow/job/step env vars', () => {
    const src = fixture(`${RULE}/echo.yml`);
    const findings = runRule(RULE, src);
    expect(findings.map((f) => f.line)).toEqual([10, 14, 15, 16, 17]);
    expect(findings.every((f) => f.severity === 'high')).toBe(true);
    const chained = findings.find((f) => f.line === 15)!;
    expect(lineOf(src, chained).slice(chained.column - 1, chained.endColumn - 1)).toBe(`printf '%s' "\${JOB_TOKEN}"`);
  });

  it('ignores piped/redirected secrets and non-secret env vars', () => {
    expect(runRule(RULE, fixture(`${RULE}/echo-safe.yml`))).toEqual([]);
  });

  it('flags secrets: inherit (high when remote and unpinned) and secrets to unpinned third-party workflows', () => {
    const findings = runRule(RULE, fixture(`${RULE}/inherit.yml`));
    expect(findings.map((f) => [f.line, f.severity])).toEqual([
      [8, 'high'],
      [11, 'high'],
      [5, 'medium'],
    ]);
  });

  it('flags secrets passed to unpinned third-party actions via with or env', () => {
    const findings = runRule(RULE, fixture(`${RULE}/third-party.yml`));
    expect(findings.map((f) => f.line)).toEqual([8, 17]);
  });

  it('flags checkout without persist-credentials: false before an artifact upload', () => {
    const findings = runRule(RULE, fixture(`${RULE}/artifact.yml`));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ line: 6, severity: 'medium' });
  });

  it('flags toJSON(secrets)', () => {
    const findings = runRule(RULE, fixture(`${RULE}/tojson.yml`));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(7);
  });
});
