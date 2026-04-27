# SCSS — Project Conventions

## BEM Naming

- Flat selectors only: `.c-card-title`, never `.c-card__title`
- Namespace prefixes: c- component, u- utility, is-/has- state
- One class per element — no chained selectors

## Nesting

- Only for: pseudo-elements, pseudo-classes, state classes, media queries
- Maximum 3 levels deep

## Units

- rem for font-size, padding, margin — never raw px (except 1px borders)
- Unitless line-height
- clamp() for fluid responsive values

## Module System

- Always `@use` — never `@import` (deprecated)
- Design tokens as CSS custom properties in :root
- Namespace imports: `@use '../tools/mixins' as *`

## Media Queries

- Mobile-first with min-width breakpoints
- Co-located in the component file, not a separate file
- Use project mixin if available
