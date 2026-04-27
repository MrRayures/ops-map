# /debug [description]

Structured debugging workflow.

## Steps

### 1. Reproduce

- Identify exact steps to reproduce
- Note: expected vs actual behavior
- Check browser console, network tab

### 2. Isolate

- Binary search: narrow to file/function
- Add strategic console.log or breakpoints
- Check recent changes (git log, git diff)

### 3. Root Cause

- Identify the exact line/condition causing the bug
- Understand WHY it happens, not just WHERE
- Check for related issues (same pattern elsewhere)

### 4. Fix

- Minimal change that addresses root cause
- No side effects on other functionality
- Add test that catches this specific bug

### 5. Verify

- Reproduce original steps — bug is gone
- Run existing tests — no regressions
- Check edge cases around the fix
