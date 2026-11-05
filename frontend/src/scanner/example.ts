/** A deliberately insecure workflow that triggers every rule. Shown via "Load example". */
export const EXAMPLE_WORKFLOW = `# ⚠️ Deliberately insecure example — do not copy into a real repository.
name: CI

on:
  pull_request_target:
    types: [opened, synchronize]
  issue_comment:
    types: [created]

permissions: write-all

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ github.event.pull_request.head.sha }}

      - name: Greet the contributor
        run: |
          echo "Building PR: \${{ github.event.pull_request.title }}"

      - name: Install and test
        run: npm ci && npm test

      - name: Debug credentials
        env:
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
        run: echo "Token is $NPM_TOKEN"

      - name: Lint Dockerfile
        uses: docker://hadolint/hadolint:latest

      - name: Deploy preview
        uses: some-org/deploy-preview-action@main
        with:
          api-key: \${{ secrets.DEPLOY_KEY }}

      - uses: actions/upload-artifact@v4
        with:
          name: workspace
          path: .

  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const body = \`\${{ github.event.comment.body }}\`;
            console.log(body);

  release:
    uses: some-org/shared-workflows/.github/workflows/release.yml@v2
    secrets: inherit
`;
