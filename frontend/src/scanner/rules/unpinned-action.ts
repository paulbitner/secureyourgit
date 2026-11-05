import type { Node } from 'yaml';
import { actionName, isGithubOwned, isPinned, parseActionRef } from '../actionRef';
import { makeFinding } from '../finding';
import type { Finding, Rule, ScanContext } from '../types';
import { scalarText } from '../workflow';

const ID = 'unpinned-action';

function checkUses(ctx: ScanContext, node: Node | undefined, where: string): Finding[] {
  const raw = scalarText(node);
  if (raw === undefined) return [];
  const ref = parseActionRef(raw);

  if (ref.kind === 'docker') {
    if (ref.hasDigest) return [];
    return [
      makeFinding(ctx, ID, node, {
        severity: 'low',
        title: `Docker image \`${ref.image}\` is not pinned to a digest`,
        message: `${where} runs the container \`${ref.image}\` by tag. Tags can be re-pointed to a different image at any time.`,
        why: 'An image digest (`@sha256:…`) is the only reference that cannot change. Without one, a compromised or careless registry push changes what runs in your pipeline.',
        fix: `uses: docker://${ref.image.split('@')[0]}@sha256:<64-char-image-digest>`,
      }),
    ];
  }

  if (ref.kind !== 'remote' || isPinned(ref)) return [];

  const name = actionName(ref);
  const githubOwned = isGithubOwned(ref);
  const kind = ref.isReusableWorkflow ? 'Reusable workflow' : 'Action';
  const version = ref.ref ?? '(none)';
  const shortSha = ref.ref !== undefined && /^[0-9a-f]{7,39}$/i.test(ref.ref);
  const detail =
    ref.ref === undefined
      ? 'has no version at all'
      : shortSha
        ? `is pinned to the short SHA \`${ref.ref}\`, which is ambiguous and not accepted as an immutable pin`
        : `uses \`@${ref.ref}\`, a tag or branch that can be moved to different code at any time`;

  return [
    makeFinding(ctx, ID, node, {
      severity: githubOwned ? 'medium' : 'high',
      title: `${kind} \`${name}@${version}\` is not pinned to a commit SHA`,
      message: `${where} ${detail}.`,
      why: githubOwned
        ? 'Even GitHub-maintained actions are referenced by mutable tags. If a tag is moved (by mistake or by an attacker with write access), every workflow using it runs the new code with your secrets and token.'
        : 'Third-party tags are controlled by whoever owns that repository. If their account or repo is compromised, the attacker can re-point the tag and run code inside your workflow with your secrets — as happened with tj-actions/changed-files in 2025.',
      fix: `uses: ${name}@<40-char-commit-sha> # ${ref.ref ?? 'latest release'}`,
      data: { owner: ref.owner, repo: ref.repo, path: ref.path, ref: ref.ref ?? '', name },
    }),
  ];
}

const rule: Rule = {
  id: ID,
  title: 'Action not pinned to a commit SHA',
  severity: 'high',
  description:
    'Actions and reusable workflows should be referenced by a full 40-character commit SHA, because tags and branches can be moved to point at different code.',
  check(ctx) {
    const findings: Finding[] = [];
    for (const job of ctx.workflow.jobs) {
      findings.push(...checkUses(ctx, job.get('uses'), `Job \`${job.id}\``));
      for (const step of job.steps) {
        const label = step.str('name') ? `Step "${step.str('name')}"` : `Step ${step.index + 1} of \`${job.id}\``;
        findings.push(...checkUses(ctx, step.get('uses'), label));
      }
    }
    return findings;
  },
};

export default rule;
