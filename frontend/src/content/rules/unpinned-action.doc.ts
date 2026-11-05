import type { RuleDoc } from './types';

const doc: RuleDoc = {
  id: 'unpinned-action',
  metaTitle: 'Pin GitHub Actions to a Commit SHA',
  metaDescription:
    'Why tags like @v4 are mutable, how the tj-actions attack abused them, and how to pin every GitHub Action and reusable workflow to a full commit SHA.',
  h1: 'Pin GitHub Actions to a full commit SHA',
  summary:
    'Every `uses:` line runs someone else’s code inside your workflow, with access to your secrets and token. A tag such as `@v4` or a branch such as `@main` is only a pointer, and whoever controls the action’s repository can move it to different code at any time. A full 40-character commit SHA is the only reference that can never change.',
  sections: [
    {
      heading: 'What this rule checks',
      paragraphs: [
        'The rule inspects every step-level `uses:` and every job-level `uses:` that calls a reusable workflow. It reports any reference that is not a full commit SHA, including references with no version at all and short SHAs such as `@b4ffde6`, which are ambiguous.',
      ],
      list: [
        'Third-party actions are reported as **high** severity: you are trusting another account’s security.',
        'Actions owned by GitHub (`actions/*`, `github/*`) are **medium**: lower risk, but tags can still move.',
        'Local actions (`./path`) are skipped because they come from your own repository.',
        '`docker://` images without an `@sha256:` digest get a separate **low** severity note.',
      ],
    },
    {
      heading: 'Why tags are not enough',
      paragraphs: [
        'Git tags are mutable. Anyone with push access to the action’s repository, or anyone who steals that access, can delete a tag and recreate it on a new commit. Every workflow that references the tag silently runs the new code on its next run.',
        'This is exactly what happened to `tj-actions/changed-files` in March 2025 (CVE-2025-30066). An attacker gained write access, re-pointed most of the action’s version tags at a malicious commit, and the payload printed CI secrets into build logs across thousands of repositories. Workflows pinned to a commit SHA were not affected.',
      ],
    },
    {
      heading: 'How to fix it',
      paragraphs: [
        'Replace the tag with the commit SHA it currently points to, and keep the human-readable version in a trailing comment. You can look the SHA up with `git ls-remote --tags https://github.com/OWNER/REPO`. For annotated tags, use the line ending in `^{}`, which is the commit rather than the tag object. The **Pin all actions** button in the Secure Your Git scanner does this for every `uses:` line at once.',
        'Make sure the SHA really belongs to the official repository. Commits from forks are reachable through the parent repository’s network, so an attacker can publish an "impostor commit" that looks legitimate. Check that the commit appears on a tag or branch of the upstream repository.',
      ],
    },
    {
      heading: 'Keeping pins up to date',
      paragraphs: [
        'Pinning does not mean freezing. Dependabot (the `github-actions` ecosystem) and Renovate both understand SHA pins with a version comment, and open pull requests that bump the SHA and the comment together. That gives you reviewed, intentional updates instead of silent ones.',
      ],
    },
  ],
  vulnerable: {
    caption: 'Mutable references: a GitHub tag, a third-party branch and a reusable workflow on main.',
    code: `jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: some-org/deploy-action@main
        with:
          token: \${{ secrets.DEPLOY_TOKEN }}
  release:
    uses: some-org/workflows/.github/workflows/release.yml@main`,
  },
  fixed: {
    caption: 'Every reference pinned to a full commit SHA, with the version kept as a comment.',
    code: `jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: some-org/deploy-action@3f1e0d7c5b9a2468ace0b1d2c3e4f5a6b7c8d9e0 # v2.1.0
        with:
          token: \${{ secrets.DEPLOY_TOKEN }}
  release:
    uses: some-org/workflows/.github/workflows/release.yml@9c8b7a6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b # v3.0.1`,
  },
  references: [
    { title: 'GitHub Docs: Secure use reference — using third-party actions', url: 'https://docs.github.com/en/actions/reference/security/secure-use' },
    { title: 'GitHub Docs: Workflow syntax — jobs.<job_id>.steps[*].uses', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax' },
    { title: 'GitHub Docs: Keeping your actions up to date with Dependabot', url: 'https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions' },
    { title: 'GitHub Docs: Managing GitHub Actions settings for a repository', url: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository' },
  ],
  faq: [
    {
      q: 'Does pinning to a SHA stop every supply-chain attack?',
      a: 'No. It guarantees the action’s own code cannot change, but a pinned action can still download unpinned tools, pull a Docker image by tag, or call other actions by tag. Review what your critical actions do, and prefer actions that pin their own dependencies.',
    },
    {
      q: 'Should I pin GitHub’s own actions too?',
      a: 'Yes. The risk is lower, which is why this rule reports them as medium rather than high, but their tags are just as mutable. Pinning everything keeps your policy simple and lets you require SHA pinning in repository settings.',
    },
    {
      q: 'Won’t pinning make me miss security fixes?',
      a: 'Not if you enable Dependabot or Renovate for GitHub Actions. You receive a pull request for each new release, so fixes arrive just as quickly but with a review step in between.',
    },
    {
      q: 'How do I pin a Docker container action?',
      a: 'Use the image digest: `docker://alpine@sha256:<digest>`. Find it with `docker buildx imagetools inspect alpine:3.20` and keep the tag in a comment.',
    },
  ],
};

export default doc;
