import type { Node } from 'yaml';
import { findExpressions, normalizeExpression } from '../expressions';
import { parseActionRef } from '../actionRef';
import { makeFinding } from '../finding';
import { locateOffsets } from '../location';
import type { Finding, Location, Rule } from '../types';
import { scalarText } from '../workflow';

const ID = 'dangerous-pull-request-target';

const PRIVILEGED_TRIGGERS = ['pull_request_target', 'workflow_run'];

/** Contexts that identify the (untrusted) head of a pull request or triggering run. */
const HEAD_CONTEXTS = [
  'github.event.pull_request.head.sha',
  'github.event.pull_request.head.ref',
  'github.event.pull_request.head.repo.full_name',
  'github.event.pull_request.merge_commit_sha',
  'github.event.pull_request.number',
  'github.event.number',
  'github.head_ref',
  'github.event.workflow_run.head_sha',
  'github.event.workflow_run.head_branch',
  'github.event.workflow_run.head_repository.full_name',
];

function referencesHead(text: string): string | undefined {
  if (/refs\/pull\//.test(text)) return 'refs/pull/…';
  for (const expr of findExpressions(text)) {
    const normalized = normalizeExpression(expr.inner);
    const hit = HEAD_CONTEXTS.find((c) => normalized.includes(c));
    if (hit) return hit;
  }
  return undefined;
}

const FIX = `# Option 1 — no secrets needed? Use the unprivileged trigger:
on: pull_request

# Option 2 — need secrets/write access? Split the work:
#   a pull_request workflow builds the untrusted code and uploads results,
#   a separate workflow_run workflow consumes those results WITHOUT
#   checking out or executing PR code.
- uses: actions/checkout@<sha> # v4
  # no "ref:" — checks out the trusted base branch
  with:
    persist-credentials: false`;

const rule: Rule = {
  id: ID,
  title: 'Privileged trigger checks out untrusted pull request code',
  severity: 'critical',
  description:
    '`pull_request_target` and `workflow_run` run with secrets and a write token. Checking out and running the pull request’s code in that context lets anyone who opens a PR execute code with those privileges ("pwn request").',
  check(ctx) {
    const trigger = ctx.workflow.triggers.find((t) => PRIVILEGED_TRIGGERS.includes(t));
    if (!trigger) return [];
    const findings: Finding[] = [];

    const report = (node: Node | Location | undefined, how: string, context: string) =>
      findings.push(
        makeFinding(ctx, ID, node, {
          severity: 'critical',
          title: `\`${trigger}\` workflow checks out pull request code`,
          message: `This workflow runs on \`${trigger}\` and ${how} (\`${context}\`). Code from the pull request author is now on disk in a job that has access to your secrets and a write-capable token.`,
          why: 'Any later step that builds, tests, installs dependencies or runs a script from that checkout executes the attacker’s code — they can steal secrets, push to your branches or poison caches and releases. This is the classic "pwn request".',
          fix: FIX,
        }),
      );

    for (const job of ctx.workflow.jobs) {
      for (const step of job.steps) {
        const uses = step.str('uses');
        const ref = uses ? parseActionRef(uses) : undefined;
        if (ref?.kind === 'remote' && ref.owner.toLowerCase() === 'actions' && ref.repo.toLowerCase() === 'checkout') {
          const withBlock = step.map('with');
          for (const key of ['ref', 'repository']) {
            const node = withBlock?.get(key);
            const hit = referencesHead(scalarText(node) ?? '');
            if (hit) report(node, `checks out the PR head via \`with.${key}\``, hit);
          }
        }

        // Search the raw source of the script so findings point at the exact line.
        const runNode = step.get('run');
        if (!runNode?.range) continue;
        const raw = ctx.source.slice(runNode.range[0], runNode.range[1]);
        let offset = runNode.range[0];
        for (const line of raw.split('\n')) {
          const at = locateOffsets(ctx.lineCounter, offset + line.search(/\S|$/), offset + line.trimEnd().length);
          if (/\bgh\s+pr\s+checkout\b/.test(line)) {
            report(at, 'runs `gh pr checkout`', 'gh pr checkout');
          } else if (/\bgit\s+(?:fetch|checkout|switch|pull|reset)\b/.test(line)) {
            const hit = referencesHead(line);
            if (hit) report(at, 'fetches the PR head with git', hit);
          }
          offset += line.length + 1;
        }
      }
    }
    return findings;
  },
};

export default rule;
