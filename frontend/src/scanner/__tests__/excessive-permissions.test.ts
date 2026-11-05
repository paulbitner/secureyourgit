import { describe, expect, it } from 'vitest';
import { fixture, lineOf, runRule } from './helpers';

const RULE = 'excessive-permissions';

describe(RULE, () => {
  it('flags a workflow with no top-level block when some job has none', () => {
    const src = fixture(`${RULE}/missing.yml`);
    const findings = runRule(RULE, src);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('medium');
    expect(lineOf(src, findings[0]!)).toBe('jobs:');
    expect(findings[0]?.message).toContain('`test`');
    expect(findings[0]?.message).not.toContain('`lint`');
  });

  it('raises severity to high on privileged triggers', () => {
    expect(runRule(RULE, fixture(`${RULE}/missing-privileged.yml`))[0]?.severity).toBe('high');
  });

  it('flags write-all at workflow and job level', () => {
    const findings = runRule(RULE, fixture(`${RULE}/write-all.yml`));
    expect(findings.map((f) => [f.severity, f.line])).toEqual([
      ['high', 2],
      ['high', 6],
    ]);
  });

  it('flags workflow-level write scopes shared by multiple jobs', () => {
    const findings = runRule(RULE, fixture(`${RULE}/top-level-writes.yml`));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toBe('Write permissions granted to every job');
    expect(findings[0]?.message).toContain('`contents`');
  });

  it('flags a job requesting many write scopes', () => {
    const findings = runRule(RULE, fixture(`${RULE}/broad-job.yml`));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toContain('`everything`');
    expect(findings[0]?.line).toBe(7);
  });

  it('accepts minimal, explicit permissions', () => {
    expect(runRule(RULE, fixture(`${RULE}/safe.yml`))).toEqual([]);
    expect(runRule(RULE, fixture(`${RULE}/safe-variants.yml`))).toEqual([]);
  });

  it('ignores composite actions', () => {
    expect(runRule(RULE, fixture('unpinned-action/composite-action.yml'))).toEqual([]);
  });
});
