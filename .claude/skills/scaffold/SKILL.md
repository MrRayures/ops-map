# /scaffold [feature-name]

Bootstrap a complete feature module.

## Files Created

```
src/features/{name}/
├── components/       # Feature-specific components
│   └── {Name}.tsx
├── hooks/            # Feature hooks
│   └── use{Name}.ts
├── utils/            # Feature utilities
├── types.ts          # Feature types
├── index.ts          # Public API
└── __tests__/        # Feature tests
```

## Conventions

- Feature encapsulates its own state, components, logic
- Only index.ts exports are public API
- Types co-located in types.ts
- Tests mirror source structure
