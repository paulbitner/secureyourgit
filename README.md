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

An ESLint rule forbids `fetch` outside `src/api/`, so workflow content can't be sent over the network by accident.

## License

Licensed under the [Apache License, Version 2.0](LICENSE). Copyright 2026 The
Secure Your Git Authors; see [`NOTICE`](NOTICE).

Contributions are accepted under the same license.
