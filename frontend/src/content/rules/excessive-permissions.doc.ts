import type { RuleDoc } from './types';

const doc: RuleDoc = {
  id: 'excessive-permissions',
  metaTitle: 'Least-Privilege GITHUB_TOKEN Permissions',
  metaDescription:
    'How GITHUB_TOKEN default permissions work, why write-all and missing permissions blocks are risky, and how to grant each job only the scopes it needs.',
  h1: 'Set least-privilege permissions for the GITHUB_TOKEN',
  summary:
    'Every job receives a `GITHUB_TOKEN` that can act on your repository. What it is allowed to do comes from the `permissions:` key in your workflow or, if that key is missing, from a default configured somewhere else. An explicit, minimal `permissions:` block limits the damage when any step in the job is compromised.',
  sections: [
    {
      heading: 'What this rule checks',
      paragraphs: ['The rule reports four situations:'],
      list: [
        'No `permissions:` at the workflow level and at least one job without its own block: **medium**. It becomes **high** on `pull_request_target` and `workflow_run`, which run with privileged tokens on outside input.',
        '`permissions: write-all` at any level: **high**.',
        'Write scopes granted at the workflow level when there is more than one job, so every job inherits them: **medium**.',
        'A single block that grants three or more write scopes: **medium**.',
      ],
    },
    {
      heading: 'How defaults work, and why relying on them is risky',
      paragraphs: [
        'When a workflow does not declare permissions, the token falls back to the default set for the repository, organization or enterprise. That default is either permissive (read and write for most scopes) or restricted (read-only `contents` and `packages`). Newer organizations default to restricted, but many older repositories still grant write access, and the setting lives outside the workflow file, where reviewers never see it.',
        'As soon as you declare any permission, every scope you did not list is set to `none` (metadata stays readable). That makes an explicit block both safer and self-documenting.',
      ],
    },
    {
      heading: 'What an attacker can do with a write token',
      paragraphs: [
        'A token with `contents: write` can push commits and tags, including to release branches that are not protected. `actions: write` can cancel or re-run workflows, `packages: write` can publish a poisoned package, and `pull-requests: write` can approve or edit pull requests. Script injection, a malicious dependency or a hijacked action only needs one of these to turn a CI bug into a repository compromise.',
      ],
    },
    {
      heading: 'How to fix it',
      paragraphs: [
        'Declare `permissions: contents: read` at the top of every workflow, then add write scopes on the individual jobs that need them. Common needs:',
      ],
      list: [
        '`pull-requests: write` to comment on or label pull requests',
        '`contents: write` to push commits or create releases',
        '`packages: write` to publish to GitHub Packages or GHCR',
        '`id-token: write` to request an OIDC token for cloud login',
        '`security-events: write` to upload code scanning results',
      ],
    },
  ],
  vulnerable: {
    caption: 'Every job, including the one that runs untrusted tests, gets write access to everything.',
    code: `on: push
permissions: write-all

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci && npm test
  release:
    runs-on: ubuntu-latest
    steps:
      - run: npm publish`,
  },
  fixed: {
    caption: 'Read-only by default; only the release job can write, and only what it needs.',
    code: `on: push
permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci && npm test
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - run: npm publish --provenance`,
  },
  references: [
    { title: 'GitHub Docs: Workflow syntax — permissions', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax' },
    { title: 'GitHub Docs: GITHUB_TOKEN', url: 'https://docs.github.com/en/actions/concepts/security/github_token' },
    { title: 'GitHub Docs: Use GITHUB_TOKEN for authentication in workflows', url: 'https://docs.github.com/en/actions/tutorials/authenticate-with-github_token' },
    { title: 'GitHub Docs: Managing GitHub Actions settings for a repository', url: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository' },
  ],
  faq: [
    {
      q: 'What does `permissions: {}` do?',
      a: 'It sets every scope to `none`. The job can still check out a public repository anonymously, but the token cannot read private contents or write anything. It is a good default for jobs that never touch the GitHub API.',
    },
    {
      q: 'Does `id-token: write` give access to my repository?',
      a: 'No. It only allows the job to request an OpenID Connect token. That token can, however, be exchanged for cloud credentials, so scope your cloud trust policy to the specific repository, branch and environment.',
    },
    {
      q: 'Do permissions apply to personal access tokens stored as secrets?',
      a: 'No. The `permissions:` key only limits the `GITHUB_TOKEN`. A PAT or GitHub App token stored in a secret keeps whatever access it was created with, so scope those separately and prefer fine-grained tokens.',
    },
    {
      q: 'Should I also change the repository default?',
      a: 'Yes. Set the default workflow permissions to read-only in repository or organization settings. Explicit blocks in each workflow and a restrictive default protect you from each other’s mistakes.',
    },
  ],
};

export default doc;
