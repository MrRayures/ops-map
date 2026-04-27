# /refactor [scope]

Safe refactoring, simplification, and cleanup with verification.

## Workflow

### 1. Snapshot

- Run all tests — record baseline
- Note current behavior and public API
- If no scope: check `git diff` for recently modified files

### 2. Analyze

For each file in scope, check:

- **Duplication** — same logic repeated? Extract to shared util/hook
- **Complexity** — functions > 30 lines? Deep nesting? Simplify
- **Dead code** — unused imports, variables, unreachable branches? Remove
- **Over-engineering** — unnecessary abstractions? Flatten
- **Naming** — unclear names? Rename for clarity

### 3. Plan

- Describe changes and rationale
- Identify risk areas
- Confirm scope with user

### 4. Execute

- Small, focused commits
- Preserve all public APIs (or document changes)
- Update imports, types, tests as needed

### 5. Verify

- All baseline tests still pass
- No TypeScript errors
- No runtime regressions
- Code is shorter or clearer (ideally both)

## Rules

- Never refactor and add features simultaneously
- Less code is better code — remove before adding
- If tests don't exist, write them BEFORE refactoring
- Rollback plan: every commit is revertable
