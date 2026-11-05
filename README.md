# Secure Your Git

Find and fix security risks in your GitHub Actions workflows. A free tool at
[secureyourgit.com](https://secureyourgit.com). Workflows are scanned entirely in the
browser; they are never uploaded.

## Repository layout

| Path | Contents |
|---|---|
| `frontend/` | Vite + React + TypeScript site, pre-rendered with vite-react-ssg; Tailwind design tokens; CodeMirror editor; scanner rules engine |
| `backend/` | FastAPI `resolve-refs` service for SHA pinning (Phase 3) |
| `infra/` | Terraform (Phases 4–5) |
| `docs/` | Design system, architecture, threat model, decisions, runbooks |
| `.github/` | CI/CD workflows (Phase 6) |

Brand name, domain and tagline live in [`frontend/src/config/site.ts`](frontend/src/config/site.ts).

## Local development

Requires Node 22+.

```sh
make install
make dev        # http://localhost:5173
make check      # lint + typecheck + tests + static build
```

## Scanner architecture

- `frontend/src/scanner/parse.ts`: parses YAML with `yaml`'s Document API and a `LineCounter`, so every node maps to a line and column.
- `frontend/src/scanner/workflow.ts`: a position-preserving model of jobs and steps that resolves anchors, aliases and `<<` merge keys and covers composite actions.
- `frontend/src/scanner/rules/*.ts`: one file per rule, each default-exporting `{ id, title, severity, description, check(ctx) }`. The registry picks rules up automatically with `import.meta.glob`, so **adding a rule means adding one file**.
- `frontend/src/scanner/__tests__/`: Vitest suites plus vulnerable and safe YAML fixtures for each rule.

## Grading

`frontend/src/report/grade.ts`:

```
score = max(0, 100 − 40·critical − 15·high − 5·medium − 1·low)
A ≥ 90 · B ≥ 80 · C ≥ 70 · D ≥ 60 · F < 60
```

One critical finding caps the grade at D and two make it F. One high finding takes an otherwise clean file to B.

## Static build

`npm run build` pre-renders every route to HTML (vite-react-ssg). It then:

1. moves inline `<script>`s into hashed files under `/assets/inline/`, and fails if any remain, so the CSP can stay at `script-src 'self'`;
2. writes `sitemap.xml` and `robots.txt` from the pages' canonical URLs, skipping `noindex` pages.

The Open Graph image comes from `frontend/scripts/og-image.html`; regenerate it with `make og-image`.

An ESLint rule forbids `fetch` outside `src/api/`, so workflow content can't be sent over the network by accident.
