import type { RuleDoc } from './types';

const doc: RuleDoc = {
  id: 'secrets-exposure',
  metaTitle: 'Keep Secrets Out of GitHub Actions Logs',
  metaDescription:
    'How GitHub Actions secrets leak through logs, artifacts, secrets: inherit and unpinned actions, and the patterns that keep each secret where it belongs.',
  h1: 'Keep secrets out of logs, artifacts and third-party code',
  summary:
    'GitHub encrypts secrets at rest and masks them in logs, but those protections only cover the exact secret value in the places GitHub controls. Once a workflow prints a secret, serializes it, hands it to code you don’t control or leaves it on disk, the platform can no longer protect it.',
  sections: [
    {
      heading: 'What this rule checks',
      list: [
        '**Printing secrets** (high): `echo`, `printf`, `cat`, `Write-Host`, `console.log` and similar, given `${{ secrets.X }}`, `${{ github.token }}` or an environment variable populated from a secret. Output that is piped or redirected (for example into `docker login --password-stdin` or `$GITHUB_ENV`) is not flagged.',
        '**`toJSON(secrets)`** (high): serializes every secret the job can see into one string.',
        '**`secrets: inherit`** (medium; high when the called workflow is remote and not pinned to a commit SHA).',
        '**Secrets passed to unpinned third-party actions** through `with:` or `env:` (high).',
        '**Credentials left on disk before an artifact upload** (medium): `actions/checkout` without `persist-credentials: false` in a job that later runs `actions/upload-artifact`.',
      ],
      paragraphs: [],
    },
    {
      heading: 'Why masking is not enough',
      paragraphs: [
        'Masking replaces exact matches of registered secret values in the log stream. It does not recognize a secret that was base64-encoded, URL-encoded, split across lines, printed one character at a time, or embedded in a JSON blob. If you store structured data such as a JSON key file as one secret, the individual fields inside it are not masked unless you register them with `::add-mask::`. Logs are readable by everyone with read access to the repository, which on a public repository means the whole internet.',
      ],
    },
    {
      heading: 'Artifacts and the persisted token',
      paragraphs: [
        'By default `actions/checkout` writes the job’s token into `.git/config` so later steps can push. If a later step uploads the workspace as an artifact, that file can go with it, and anyone who can download artifacts can use the token until the job ends. Researchers named this pattern "ArtiPACKED" in 2024. Since version 4.4, `actions/upload-artifact` excludes hidden files by default, but setting `persist-credentials: false` removes the risk at the source.',
      ],
    },
    {
      heading: 'How to fix it',
      paragraphs: [
        'Give each tool only the secret it needs, through an environment variable or standard input, and never echo it. Pass reusable workflows an explicit `secrets:` map instead of `inherit`. Pin any action that receives a secret to a full commit SHA. Set `persist-credentials: false` on checkout unless a later step really pushes.',
      ],
    },
  ],
  vulnerable: {
    caption: 'A printed secret, an inherited secret set and a token persisted into an uploaded workspace.',
    code: `jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - env:
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
        run: echo "Using token $NPM_TOKEN"
      - uses: actions/upload-artifact@v4
        with:
          path: .
  deploy:
    uses: some-org/workflows/.github/workflows/deploy.yml@main
    secrets: inherit`,
  },
  fixed: {
    caption: 'Secrets reach only the tools that need them, nothing is printed and nothing is left on disk.',
    code: `jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
        run: npm ci
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          path: dist
  deploy:
    uses: some-org/workflows/.github/workflows/deploy.yml@9c8b7a6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b # v3.0.1
    secrets:
      DEPLOY_KEY: \${{ secrets.DEPLOY_KEY }}`,
  },
  references: [
    { title: 'GitHub Docs: Using secrets in GitHub Actions', url: 'https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets' },
    { title: 'GitHub Docs: Secure use reference', url: 'https://docs.github.com/en/actions/reference/security/secure-use' },
    { title: 'GitHub Docs: Reusing workflow configurations — passing secrets', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations' },
    { title: 'actions/checkout: persist-credentials input', url: 'https://github.com/actions/checkout' },
  ],
  faq: [
    {
      q: 'Is the `GITHUB_TOKEN` a secret too?',
      a: 'Yes. It is masked automatically and expires when the job finishes, but while the job runs it carries every permission you granted. Treat it like any other secret.',
    },
    {
      q: 'A secret was printed in a log. What should I do?',
      a: 'Rotate the secret immediately; deleting the log is not enough, because it may already have been read or archived. Then delete the workflow run logs, check the provider’s audit log for misuse, and fix the workflow.',
    },
    {
      q: 'Why is `secrets: inherit` flagged when the workflow is in my own repository?',
      a: 'Inheriting hands the called workflow every repository, environment and organization secret, not just the few it uses. An explicit map documents exactly what it needs and limits the blast radius of a bug.',
    },
  ],
};

export default doc;
