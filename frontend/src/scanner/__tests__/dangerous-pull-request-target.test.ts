import { describe, expect, it } from 'vitest';
import { fixture, lineOf, runRule } from './helpers';

const RULE = 'dangerous-pull-request-target';

describe(RULE, () => {
  it('flags checkout of the PR head SHA under pull_request_target', () => {
    const src = fixture(`${RULE}/head-sha.yml`);
    const findings = runRule(RULE, src);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('critical');
    expect(lineOf(src, findings[0]!)).toContain('ref: ${{ github.event.pull_request.head.sha }}');
  });

  it('handles list-form triggers, repository input and bracket notation', () => {
    const findings = runRule(RULE, fixture(`${RULE}/head-ref-variants.yml`));
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.message).join()).toMatch(/with\.repository.*with\.ref|with\.ref.*with\.repository/s);
  });

  it('flags workflow_run checking out the triggering head', () => {
    const findings = runRule(RULE, fixture(`${RULE}/workflow-run.yml`));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toContain('workflow_run');
  });

  it('flags gh pr checkout and git fetch of PR refs in run scripts', () => {
    const findings = runRule(RULE, fixture(`${RULE}/run-checkout.yml`));
    expect(findings.map((f) => f.line)).toEqual([6, 11]);
  });

  it('allows pull_request_target that checks out the base branch', () => {
    expect(runRule(RULE, fixture(`${RULE}/safe-base.yml`))).toEqual([]);
  });

  it('allows checking out the head on the unprivileged pull_request trigger', () => {
    expect(runRule(RULE, fixture(`${RULE}/safe-pull-request.yml`))).toEqual([]);
  });
});
