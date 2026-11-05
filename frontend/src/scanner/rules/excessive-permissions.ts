import { makeFinding } from '../finding';
import type { Finding, Rule, ScanContext } from '../types';
import { mapView, scalarText, type Entry } from '../workflow';

const ID = 'excessive-permissions';

/** A single permissions block holding this many write scopes is flagged as broad. */
export const BROAD_WRITE_THRESHOLD = 3;

const PRIVILEGED_TRIGGERS = new Set(['pull_request_target', 'workflow_run']);

const READ_ONLY_FIX = `permissions:
  contents: read`;

function checkBlock(ctx: ScanContext, entry: Entry, scope: string, jobCount: number): Finding[] {
  const value = entry.value;
  const text = scalarText(value);
  if (text === 'write-all') {
    return [
      makeFinding(ctx, ID, value, {
        severity: 'high',
        title: `\`permissions: write-all\` on ${scope}`,
        message: `${scope[0]!.toUpperCase()}${scope.slice(1)} grants the GITHUB_TOKEN write access to every scope: code, packages, releases, issues, pull requests, workflows and more.`,
        why: 'Any step that is compromised (a malicious dependency, an injected script, a hijacked action) inherits all of that access and can push code, publish packages or tamper with releases.',
        fix: `${READ_ONLY_FIX}\n  # add only the write scopes this job needs, e.g.\n  # pull-requests: write`,
      }),
    ];
  }

  const block = mapView(ctx.doc, value);
  if (!block) return [];
  const writes = [...block.entries.values()].filter((e) => scalarText(e.value) === 'write').map((e) => e.key);
  if (writes.length === 0) return [];

  const findings: Finding[] = [];
  const list = writes.map((w) => `\`${w}\``).join(', ');
  if (scope === 'the whole workflow' && jobCount > 1) {
    findings.push(
      makeFinding(ctx, ID, entry.keyNode, {
        severity: 'medium',
        title: 'Write permissions granted to every job',
        message: `The workflow-level \`permissions:\` block grants ${list} write access to all ${jobCount} jobs, even those that only need to read.`,
        why: 'Least privilege works per job. Granting write at the top means a compromise of any job — including test or lint jobs that run untrusted code — gets write access.',
        fix: `${READ_ONLY_FIX}\n\njobs:\n  release:\n    permissions:\n      contents: write`,
      }),
    );
  } else if (writes.length >= BROAD_WRITE_THRESHOLD) {
    findings.push(
      makeFinding(ctx, ID, entry.keyNode, {
        severity: 'medium',
        title: `Broad write permissions on ${scope}`,
        message: `${scope[0]!.toUpperCase()}${scope.slice(1)} requests write access to ${writes.length} scopes (${list}). Few jobs genuinely need that many.`,
        why: 'Every extra write scope widens what an attacker can do with a stolen or misused GITHUB_TOKEN.',
        fix: `permissions:\n  contents: read\n  ${writes[0]}: write  # keep only what this job uses`,
      }),
    );
  }
  return findings;
}

const rule: Rule = {
  id: ID,
  title: 'Missing or excessive token permissions',
  severity: 'high',
  description:
    'Workflows should declare an explicit, minimal `permissions:` block so the GITHUB_TOKEN cannot do more than each job needs.',
  check(ctx) {
    const { workflow } = ctx;
    if (workflow.kind !== 'workflow' || !workflow.root) return [];
    const findings: Finding[] = [];
    const top = workflow.root.entries.get('permissions');
    if (top) findings.push(...checkBlock(ctx, top, 'the whole workflow', workflow.jobs.length));

    const jobsWithout: string[] = [];
    for (const job of workflow.jobs) {
      const perms = job.entries.get('permissions');
      if (perms) findings.push(...checkBlock(ctx, perms, `job \`${job.id}\``, workflow.jobs.length));
      else jobsWithout.push(job.id);
    }

    if (!top && jobsWithout.length > 0) {
      const privileged = workflow.triggers.some((t) => PRIVILEGED_TRIGGERS.has(t));
      const anchor = workflow.root.entries.get('jobs')?.keyNode;
      const names = jobsWithout.map((j) => `\`${j}\``).join(', ');
      findings.push(
        makeFinding(ctx, ID, anchor, {
          severity: privileged ? 'high' : 'medium',
          title: 'No `permissions:` block — token permissions fall back to defaults',
          message: `Neither the workflow nor job${jobsWithout.length > 1 ? 's' : ''} ${names} declare \`permissions:\`, so the GITHUB_TOKEN gets the repository or organization default, which is read/write on older repositories.`,
          why: privileged
            ? 'This workflow runs on a trigger that handles code or data from outside contributors with a privileged token. An implicit write token turns any injection bug into a repository takeover.'
            : 'Defaults are set outside the workflow file and can silently change. Declaring permissions makes the token\'s power explicit, reviewable and minimal.',
          fix: `${READ_ONLY_FIX}\n\njobs:\n  ...`,
        }),
      );
    }
    return findings;
  },
};

export default rule;
