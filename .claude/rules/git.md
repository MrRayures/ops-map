# Git — Conventions

## Commits

```
type(scope): short description

Optional body with details.
```

### Types

- feat: new feature
- fix: bug fix
- refactor: code restructuring (no behavior change)
- docs: documentation changes
- test: adding/updating tests
- chore: tooling, deps, CI
- style: formatting (no logic change)
- perf: performance improvement

### Rules

- Subject line: max 72 chars, imperative mood
- Body: wrap at 72 chars, explain WHY not WHAT
- One logical change per commit
- Never commit: .env, secrets, node_modules, build artifacts

## Branches

- main: production-ready, always deployable
- feature/description: new features
- fix/description: bug fixes
- chore/description: maintenance

## Pull Requests

- Small, focused PRs (< 400 lines changed)
- Description: what, why, how to test
- Squash merge to main (clean history)
- Delete branch after merge
