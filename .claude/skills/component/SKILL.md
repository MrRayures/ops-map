# /component [name]

Scaffold a new component.

## Files Created

```
src/components/{Name}/
├── {Name}.tsx        # Implementation
├── {Name}.scss  # Styles
├── {Name}.test.tsx   # Tests
└── index.ts          # Public export
```

## Conventions

- Typed Props interface with JSDoc
- Default export for the component
- Named export for types
- Semantic HTML, accessible markup
- BEM flat selectors with c- prefix

## Post-creation Checklist

1. Renders without errors
2. Keyboard accessible
3. Props documented
4. Basic test passes
