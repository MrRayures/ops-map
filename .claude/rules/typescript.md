# TypeScript — Project Conventions

## Strictness

- strict: true in tsconfig — no exceptions
- No `any` — use `unknown` and type guards to narrow
- No non-null assertions (!) unless provably safe

## Types vs Interfaces

- Interface for object shapes and class contracts
- Type for unions, intersections, mapped types, primitives
- Prefer `as const` objects over enum keyword

## Functions

- Explicit return types on all exported functions
- Use overloads for complex function signatures
- Prefer generic constraints over type assertions

## Imports

- Type-only imports: `import type { Foo } from './bar'`
- Organize: external → internal → relative → types
- No circular imports

## Error Handling

- Custom Error subclasses for domain errors
- Never catch and ignore — at minimum log
- Use Result<T, E> pattern for expected failures
