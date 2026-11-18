# Security Policy

Secure Your Git is a security tool, so we take reports about its own security
seriously. Thank you for helping keep it and its users safe.

## Reporting a vulnerability

**Please don't open a public issue, pull request, or discussion for a
security problem.**

Report it privately through GitHub instead:

1. Go to the [Security tab](https://github.com/paulbitner/secureyourgit/security)
   of this repository.
2. Click **Report a vulnerability**.
3. Fill in the form. Only you and the maintainers can see it.

A dedicated security email address is coming. Until then, GitHub private
vulnerability reporting is the only channel we monitor for security reports.

### What to include

- What the problem is and what an attacker could do with it
- Steps to reproduce, or a proof of concept
- The affected URL, file, or commit
- Your name or handle if you'd like credit (optional)

## What happens next

We're a small team, so these are targets rather than guarantees:

| Step | Target |
|---|---|
| We confirm we received your report | 3 business days |
| We tell you whether we can reproduce it, and how serious we think it is | 10 business days |
| We fix critical and high-severity issues | 30 days from confirmation |

We'll keep you updated, tell you when it's fixed, and agree a disclosure date
with you. We publish fixed vulnerabilities as GitHub security advisories and
credit reporters who want to be credited.

We don't run a paid bug bounty yet.

## Scope

**In scope**

- The site at [secureyourgit.com](https://secureyourgit.com)
- The code in this repository, including the scanner rules, the build
  scripts, and the GitHub Actions workflows

We especially want to hear about anything that breaks our core promise:
**workflows pasted into the scanner never leave your browser.** Any way to make
workflow content reach a server, a third party, or another user is treated as
critical.

**Out of scope**

- Denial of service, or load and volume testing
- Social engineering, phishing, or physical attacks
- Vulnerabilities in GitHub, AWS, or other third-party services we use (report
  those to the vendor)
- Reports from automated tools without a demonstrated impact
- Missing security headers or best practices without a working exploit
- A scanner rule that misses an issue or flags a safe workflow (please open a
  normal issue for those)

## Safe harbor

If you make a good-faith effort to follow this policy, we won't pursue or
support legal action against you for your research. Please:

- Test only against your own data, and don't access or change other people's
  data
- Stop and report as soon as you find a problem; don't keep exploring
- Give us reasonable time to fix the issue before you disclose it publicly

## Supported versions

Only the current version of the site and the `main` branch of this repository
receive security fixes.
