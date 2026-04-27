# JavaScript — Project Conventions

## Modern Syntax

- ES2022+ features: optional chaining, nullish coalescing, at()
- const by default, let only when reassigning — never var
- Template literals for string interpolation
- Destructuring for objects and arrays

## Functions

- Arrow functions for callbacks and short functions
- Function declarations for top-level named functions
- Default parameters over manual fallbacks
- Max 30 lines per function — extract if longer

## Async

- async/await over raw Promises — never callbacks
- Promise.all() for parallel operations
- Always handle errors with try/catch or .catch()
- AbortController for cancellable requests

## Modules

- ES modules (import/export) — never CommonJS
- Named exports preferred over default exports
- Organize: external → internal → relative
- No circular imports

## Error Handling

- Custom Error classes for domain errors
- Never catch and silently ignore
- Validate at system boundaries (user input, API responses)
- Use optional chaining for nullable access

## Avoid

- No eval(), Function(), document.write()
- No console.log in production code
- No global variables — use modules
- No == — always ===
