import { visit, type Node } from 'yaml';
import { actionName, isGithubOwned, isPinned, parseActionRef, type ActionRef } from '../actionRef';
import { findExpressions, normalizeExpression } from '../expressions';
import { makeFinding } from '../finding';
import { locateOffsets } from '../location';
import type { Finding, Rule, ScanContext } from '../types';
import { scalarText, type MapView, type StepModel } from '../workflow';

const ID = 'secrets-exposure';

const SECRET_EXPR = /\bsecrets\s*[.[]|\bgithub\.token\b/i;
/** Commands that write their arguments to the job log. */
const PRINT_CMD = /^\s*(?:echo|printf|print|cat|write-host|write-output|console\.log|puts)\b/i;

function containsSecret(text: string | undefined): boolean {
  return !!text && findExpressions(text).some((e) => SECRET_EXPR.test(e.inner));
}

function nodeSource(ctx: ScanContext, node: Node | undefined): string {
  return node?.range ? ctx.source.slice(node.range[0], node.range[1]) : '';
}

function secretEnvVars(...envs: (MapView | undefined)[]): Set<string> {
  const vars = new Set<string>();
  for (const env of envs) {
    for (const e of env?.entries.values() ?? []) if (containsSecret(scalarText(e.value))) vars.add(e.key);
  }
  return vars;
}

function referencesSecret(segment: string, secretVars: Set<string>): boolean {
  if (containsSecret(segment)) return true;
  for (const v of secretVars) {
    const re = new RegExp(`\\$(?:\\{${v}\\}|${v}\\b|env:${v}\\b)`);
    if (re.test(segment)) return true;
  }
  return false;
}

function checkPrintedSecrets(ctx: ScanContext, runNode: Node | undefined, secretVars: Set<string>): Finding[] {
  if (!runNode?.range) return [];
  const [start, end] = runNode.range;
  const raw = ctx.source.slice(start, end);
  const findings: Finding[] = [];
  let lineOffset = 0;
  for (const line of raw.split('\n')) {
    let segOffset = 0;
    for (const segment of line.split(/(&&|\|\||;)/)) {
      const isSeparator = segment === '&&' || segment === '||' || segment === ';';
      // Piped (`| docker login --password-stdin`) or redirected output never reaches the log.
      const leavesLog = /(^|[^|])\|(?!\|)|>/.test(segment);
      if (!isSeparator && PRINT_CMD.test(segment) && !leavesLog && referencesSecret(segment, secretVars)) {
        const lead = segment.length - segment.trimStart().length;
        const abs = start + lineOffset + segOffset + lead;
        findings.push(
          makeFinding(ctx, ID, locateOffsets(ctx.lineCounter, abs, abs + segment.trim().length), {
            severity: 'high',
            title: 'Secret printed to the job log',
            message: `\`${segment.trim().slice(0, 80)}\` writes a secret to standard output.`,
            why: 'GitHub masks exact secret values in logs, but masking fails as soon as the value is transformed (base64, JSON, split across lines, partial output). Logs are readable by anyone with read access — on public repos, by everyone.',
            fix: 'run: |\n  # pass secrets to tools via env or stdin; never print them\n  some-tool --token-from-env',
          }),
        );
      }
      segOffset += segment.length;
    }
    lineOffset += line.length + 1;
  }
  return findings;
}

function isThirdPartyUnpinned(ref: ActionRef | undefined): ref is Extract<ActionRef, { kind: 'remote' }> {
  return ref?.kind === 'remote' && !isPinned(ref) && !isGithubOwned(ref);
}

function isAction(ref: ActionRef | undefined, repo: string): boolean {
  return ref?.kind === 'remote' && ref.owner.toLowerCase() === 'actions' && ref.repo.toLowerCase() === repo;
}

function refOf(step: MapView): ActionRef | undefined {
  const uses = step.str('uses');
  return uses ? parseActionRef(uses) : undefined;
}

function checkArtifactCredentials(ctx: ScanContext, steps: StepModel[]): Finding[] {
  const findings: Finding[] = [];
  steps.forEach((step, i) => {
    if (!isAction(refOf(step), 'checkout')) return;
    if (scalarText(step.map('with')?.get('persist-credentials')) === 'false') return;
    const uploads = steps.slice(i + 1).some((s) => isAction(refOf(s), 'upload-artifact'));
    if (!uploads) return;
    findings.push(
      makeFinding(ctx, ID, step.get('uses'), {
        severity: 'medium',
        title: '`actions/checkout` keeps credentials on disk before an artifact upload',
        message:
          'By default `actions/checkout` writes the GITHUB_TOKEN into `.git/config`. A later step in this job uploads an artifact, which can include that file.',
        why: 'Artifacts are downloadable by anyone who can read the repository (everyone, on public repos). A leaked token is valid until the job finishes — long enough to be abused by automated scrapers ("ArtiPACKED").',
        fix: '- uses: actions/checkout@<sha> # v4\n  with:\n    persist-credentials: false',
      }),
    );
  });
  return findings;
}

const rule: Rule = {
  id: ID,
  title: 'Secrets exposure',
  severity: 'high',
  description:
    'Secrets should never be printed, passed wholesale to other workflows, handed to unpinned third-party code, or left on disk where artifacts can capture them.',
  check(ctx) {
    const { workflow } = ctx;
    const findings: Finding[] = [];

    // toJSON(secrets) anywhere dumps every secret the job can see.
    visit(ctx.doc, {
      Scalar(_, node) {
        if (!node.range) return;
        const raw = ctx.source.slice(node.range[0], node.range[1]);
        for (const e of findExpressions(raw)) {
          if (!/\btojson\s*\(\s*secrets\s*\)/.test(normalizeExpression(e.inner))) continue;
          const abs = node.range[0] + e.start;
          findings.push(
            makeFinding(ctx, ID, locateOffsets(ctx.lineCounter, abs, node.range[0] + e.end), {
              severity: 'high',
              title: '`toJSON(secrets)` exposes every secret at once',
              message: 'This expression serializes all secrets available to the job into a single string.',
              why: 'The JSON blob is not masked as a whole and hands every secret to whatever consumes it, instead of only the one value that is needed.',
              fix: 'env:\n  API_TOKEN: ${{ secrets.API_TOKEN }}  # reference only what you need',
            }),
          );
        }
      },
    });

    for (const job of workflow.jobs) {
      const jobUses = job.str('uses');
      const jobRef = jobUses ? parseActionRef(jobUses) : undefined;
      const secretsEntry = job.entries.get('secrets');
      if (jobRef && secretsEntry) {
        if (scalarText(secretsEntry.value) === 'inherit') {
          const risky = jobRef.kind === 'remote' && !isPinned(jobRef);
          findings.push(
            makeFinding(ctx, ID, secretsEntry.value, {
              severity: risky ? 'high' : 'medium',
              title: `\`secrets: inherit\` passes every secret to \`${jobUses}\``,
              message: `Job \`${job.id}\` forwards all repository, environment and organization secrets to the called workflow${risky ? ', which is not pinned to a commit SHA' : ''}.`,
              why: 'The called workflow only needs a few secrets. Inheriting all of them means a bug or compromise there exposes everything — and a moved tag can swap in code that exfiltrates them.',
              fix: 'secrets:\n  NPM_TOKEN: ${{ secrets.NPM_TOKEN }}  # pass only what the workflow declares',
            }),
          );
        } else if (isThirdPartyUnpinned(jobRef) && containsSecret(nodeSource(ctx, secretsEntry.value))) {
          findings.push(
            makeFinding(ctx, ID, secretsEntry.keyNode, {
              severity: 'high',
              title: `Secrets passed to unpinned third-party workflow \`${actionName(jobRef)}\``,
              message: `Job \`${job.id}\` hands secrets to a reusable workflow referenced by \`@${jobRef.ref ?? '(none)'}\`.`,
              why: 'Whoever controls that tag controls the code that receives your secrets.',
              fix: `uses: ${actionName(jobRef)}@<40-char-commit-sha> # ${jobRef.ref ?? ''}`,
            }),
          );
        }
      }

      const jobSecretVars = secretEnvVars(workflow.root?.map('env'), job.map('env'));
      for (const step of job.steps) {
        const stepEnv = step.map('env');
        const vars = new Set([...jobSecretVars, ...secretEnvVars(stepEnv)]);
        findings.push(...checkPrintedSecrets(ctx, step.get('run'), vars));

        const ref = refOf(step);
        if (isThirdPartyUnpinned(ref)) {
          const inputs = [...(step.map('with')?.entries.values() ?? []), ...(stepEnv?.entries.values() ?? [])];
          const leaking = inputs.find((e) => containsSecret(scalarText(e.value)));
          if (leaking) {
            findings.push(
              makeFinding(ctx, ID, leaking.value, {
                severity: 'high',
                title: `Secret passed to unpinned third-party action \`${actionName(ref)}\``,
                message: `\`${leaking.key}\` receives a secret, but the action is referenced by \`@${ref.ref ?? '(none)'}\`, which its owner can change at any time.`,
                why: 'If the action’s repository is compromised and the tag is moved, the new code receives this secret on its next run — the attack pattern used against tj-actions/changed-files and reviewdog in 2025.',
                fix: `uses: ${actionName(ref)}@<40-char-commit-sha> # ${ref.ref ?? ''}`,
              }),
            );
          }
        }
      }
      findings.push(...checkArtifactCredentials(ctx, job.steps));
    }
    return findings;
  },
};

export default rule;
