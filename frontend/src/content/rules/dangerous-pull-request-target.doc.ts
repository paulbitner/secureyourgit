import type { RuleDoc } from './types';

const doc: RuleDoc = {
  id: 'dangerous-pull-request-target',
  metaTitle: 'pull_request_target Pwn Requests Explained',
  metaDescription:
    'Why checking out pull request code in a pull_request_target or workflow_run workflow hands secrets to attackers, and how to split privileged work safely.',
  h1: 'Don’t run pull request code in pull_request_target workflows',
  summary:
    '`pull_request_target` and `workflow_run` exist so that workflows can react to contributions from forks with full privileges: secrets, a write-capable token and access to caches. That is safe only while the workflow never executes code from the pull request. Checking out the PR head in that context lets anyone who opens a pull request run code with your secrets, an attack GitHub Security Lab calls a "pwn request".',
  sections: [
    {
      heading: 'What this rule checks',
      paragraphs: [
        'In workflows triggered by `pull_request_target` or `workflow_run`, the rule reports any of the following as **critical**:',
      ],
      list: [
        '`actions/checkout` with a `ref:` or `repository:` taken from the pull request head, such as `github.event.pull_request.head.sha`, `head.ref`, `head.repo.full_name` or `github.head_ref`',
        'checkout of `github.event.workflow_run.head_sha` or `head_branch`',
        'references to `refs/pull/…`, including the merge ref, which also contains the attacker’s changes',
        '`gh pr checkout`, or `git fetch`/`git checkout` of PR refs, in a `run:` script',
      ],
    },
    {
      heading: 'Why this is so dangerous',
      paragraphs: [
        'Unlike `pull_request`, which runs fork contributions with a read-only token and no secrets, `pull_request_target` runs the workflow file from your base branch with full privileges. By default `actions/checkout` checks out that trusted base code, which is fine. The danger starts when the workflow explicitly checks out the contributor’s code.',
        'Executing it does not require an obvious `run: ./script.sh`. `npm install` runs lifecycle scripts from `package.json`. Build tools read executable configuration files. Test runners import whatever the pull request changed. Any of these gives the attacker a shell in a job that can read your secrets and push to your repository.',
        '`workflow_run` has the same problem. It runs privileged after another workflow finishes, so checking out the triggering commit or executing artifacts it produced reintroduces the attacker’s code.',
      ],
    },
    {
      heading: 'How to fix it',
      paragraphs: [
        'If the job only builds and tests, switch to `on: pull_request`. Fork contributions then run without secrets and with a read-only token, which is exactly the right trust level.',
        'If you genuinely need privileges, for example to post a comment with test results, split the work in two. An unprivileged `pull_request` workflow builds the code and uploads results as an artifact. A separate `workflow_run` workflow downloads that artifact, treats it strictly as untrusted data (it never executes it, and it validates its contents), and posts the comment. Keep `persist-credentials: false` on any checkout.',
      ],
    },
  ],
  vulnerable: {
    caption: 'A privileged workflow checks out and installs the contributor’s code.',
    code: `on: pull_request_target

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}
      - run: npm ci && npm test
        env:
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}`,
  },
  fixed: {
    caption: 'Fork code runs on pull_request without secrets. A separate workflow_run workflow can post the uploaded results, but never executes them.',
    code: `on: pull_request
permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - run: npm ci && npm test > results.txt
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: results
          path: results.txt`,
  },
  references: [
    { title: 'GitHub Security Lab: Preventing pwn requests', url: 'https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/' },
    { title: 'GitHub Docs: Events that trigger workflows — pull_request_target', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows' },
    { title: 'GitHub Docs: Secure use reference', url: 'https://docs.github.com/en/actions/reference/security/secure-use' },
  ],
  faq: [
    {
      q: 'Is `pull_request_target` always dangerous?',
      a: 'No. Labeling, triaging, or commenting on pull requests without checking out or executing their code is the intended use, and this rule does not flag it.',
    },
    {
      q: 'Can I gate the workflow on a "safe to test" label?',
      a: 'Only with great care. If the workflow checks out `head.ref`, an attacker can push a new commit after a maintainer adds the label. If you must do this, check out the exact `head.sha` that was reviewed, and remove the label on every new push.',
    },
    {
      q: 'Is checking out the merge commit safer than the head?',
      a: 'No. `refs/pull/N/merge` contains the pull request’s changes merged into your base branch, so it runs the attacker’s code just the same.',
    },
  ],
};

export default doc;
