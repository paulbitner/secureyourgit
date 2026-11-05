import { describe, expect, it } from 'vitest';
import { isPinned, parseActionRef } from '../actionRef';
import { EXAMPLE_WORKFLOW } from '../example';
import { findExpressions, findUntrustedReferences, normalizeExpression } from '../expressions';
import { parseWorkflow } from '../parse';
import { rules } from '../registry';
import { scan } from '../scan';
import type { Rule } from '../types';
import { buildWorkflowModel } from '../workflow';
import { site } from '../../config/site';

describe('parseActionRef', () => {
  it('parses remote actions, sub-paths and reusable workflows', () => {
    expect(parseActionRef('github/codeql-action/init@v3')).toMatchObject({
      kind: 'remote', owner: 'github', repo: 'codeql-action', path: 'init', ref: 'v3', isReusableWorkflow: false,
    });
    expect(parseActionRef('o/r/.github/workflows/x.yaml@main')).toMatchObject({ isReusableWorkflow: true, ref: 'main' });
    expect(parseActionRef('o/r')).toMatchObject({ kind: 'remote', ref: undefined });
  });

  it('classifies local, docker and invalid refs', () => {
    expect(parseActionRef('./.github/actions/x').kind).toBe('local');
    expect(parseActionRef('docker://alpine:3')).toMatchObject({ kind: 'docker', hasDigest: false });
    expect(parseActionRef(`docker://alpine@sha256:${'0'.repeat(64)}`)).toMatchObject({ hasDigest: true });
    expect(parseActionRef('nonsense').kind).toBe('invalid');
  });

  it('only treats a full 40-char hex SHA as pinned', () => {
    expect(isPinned(parseActionRef(`a/b@${'a'.repeat(40)}`))).toBe(true);
    expect(isPinned(parseActionRef(`a/b@${'a'.repeat(39)}`))).toBe(false);
    expect(isPinned(parseActionRef('a/b@v1'))).toBe(false);
  });
});

describe('expressions', () => {
  it('finds expressions with offsets, including multi-line ones', () => {
    const text = 'a ${{ x }} b ${{\n y }}';
    expect(findExpressions(text).map((e) => text.slice(e.start, e.end))).toEqual(['${{ x }}', '${{\n y }}']);
  });

  it('normalizes bracket notation and case', () => {
    expect(normalizeExpression("GitHub.Event['Issue'][\"title\"]")).toBe('github.event.issue.title');
    expect(normalizeExpression('github.event.commits[0].message')).toBe('github.event.commits.*.message');
  });

  it('detects untrusted contexts, sub-fields, leaf names and toJSON of ancestors', () => {
    const paths = (e: string) => findUntrustedReferences(e).map((r) => r.path);
    expect(paths(' github.event.issue.title ')).toEqual(['github.event.issue.title']);
    expect(paths("format('{0}', github.event.pull_request.head.ref)")).toEqual(['github.event.pull_request.head.ref']);
    expect(paths('github.event.release.body')).toEqual(['github.event.release.body']);
    expect(paths('toJSON(github.event)')).toEqual(['github.event']);
    expect(paths('github.event')).toEqual([]);
    expect(paths('github.event.issue.number')).toEqual([]);
    expect(paths('github.sha')).toEqual([]);
  });
});

describe('workflow model', () => {
  const model = (src: string) => buildWorkflowModel(parseWorkflow(src).doc);

  it('reads triggers in string, list and map form', () => {
    expect(model('on: push\njobs: {}').triggers).toEqual(['push']);
    expect(model('on: [push, pull_request]\njobs: {}').triggers).toEqual(['push', 'pull_request']);
    expect(model('on:\n  issues:\n  workflow_dispatch:\njobs: {}').triggers).toEqual(['issues', 'workflow_dispatch']);
  });

  it('resolves merge keys with explicit keys taking precedence', () => {
    const m = model('base: &b\n  runs-on: a\n  timeout-minutes: 5\non: push\njobs:\n  j:\n    <<: *b\n    runs-on: b\n');
    expect(m.jobs[0]?.str('runs-on')).toBe('b');
    expect(m.jobs[0]?.str('timeout-minutes')).toBe('5');
  });

  it('recognises composite actions', () => {
    expect(model('runs:\n  using: composite\n  steps:\n    - run: x\n').kind).toBe('composite');
    expect(model('just: data\n').kind).toBe('unknown');
  });
});

describe('scan', () => {
  it('reports parse errors with positions and no findings', () => {
    const result = scan('on: push\njobs:\n  a: [unclosed\n');
    expect(result.findings).toEqual([]);
    expect(result.parseErrors[0]?.line).toBeGreaterThan(0);
  });

  it(`refuses input over ${site.maxInputBytes} bytes without parsing it`, () => {
    const result = scan('#'.repeat(site.maxInputBytes + 1));
    expect(result.tooLarge).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it('survives a rule that throws', () => {
    const bad: Rule = { id: 'bad', title: 'bad', severity: 'low', description: '', check: () => { throw new Error('boom'); } };
    const original = console.error;
    console.error = () => {};
    try {
      expect(scan('on: push\njobs: {}\n', [bad]).findings).toEqual([]);
    } finally {
      console.error = original;
    }
  });

  it('does not blow up on alias-heavy ("billion laughs") input', () => {
    const lines = ['a: &a [x, x, x, x, x, x, x, x, x, x]'];
    for (let i = 1; i < 10; i++) lines.push(`${String.fromCharCode(97 + i)}: &${String.fromCharCode(97 + i)} [${Array(10).fill(`*${String.fromCharCode(96 + i)}`).join(', ')}]`);
    lines.push('on: push', 'jobs:', '  j:', '    steps: *j');
    const start = performance.now();
    scan(lines.join('\n'));
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it('the example workflow triggers every registered rule, sorted by severity', () => {
    const { findings, parseErrors } = scan(EXAMPLE_WORKFLOW);
    expect(parseErrors).toEqual([]);
    expect(new Set(findings.map((f) => f.ruleId))).toEqual(new Set(rules.map((r) => r.id)));
    expect(new Set(findings.map((f) => f.severity))).toEqual(new Set(['critical', 'high', 'medium', 'low']));
    const order = ['critical', 'high', 'medium', 'low'];
    const ranks = findings.map((f) => order.indexOf(f.severity));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
});

describe('registry', () => {
  it('registers the five MVP rules with unique kebab-case ids and complete metadata', () => {
    expect(rules.map((r) => r.id)).toEqual([
      'dangerous-pull-request-target',
      'excessive-permissions',
      'script-injection',
      'secrets-exposure',
      'unpinned-action',
    ]);
    for (const r of rules) {
      expect(r.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(r.title.length).toBeGreaterThan(5);
      expect(r.description.length).toBeGreaterThan(20);
    }
  });
});
