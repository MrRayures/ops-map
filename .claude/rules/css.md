# CSS — Project Conventions

## Folder

Put all CSS file in src/styles/

## Custom Properties

- Define design tokens in :root
- Use semantic naming: --color-primary, --space-md
- Scope overrides to components: .c-card { --card-bg: ... }

## Selectors BEM Naming

- Class-based selectors only — no IDs for styling
- Namespace prefixes: c- component, u- utility, is-/has- state
- One class per element — no chained selectors
- :where() for zero-specificity resets
- :is() for grouping related selectors

## Nesting

- Only for: pseudo-elements, pseudo-classes, state classes, media queries
- Maximum 1 levels deep

## Layout

- Flexbox for 1D layouts, Grid for 2D layouts
- Logical properties: margin-inline, padding-block
- clamp() for fluid values (font-size, spacing)
- Container queries for component-level responsive

## Units

- rem for font-size, padding, margin
- px only for borders and shadows
- Unitless line-height
- Percentage/viewport units for layout dimensions

## Media Queries

- Mobile-first with min-width
- Co-located with the component rules
- Use prefers-reduced-motion, prefers-color-scheme

## Avoid

- No !important
- No element selectors in components (div, span)
- No inline styles in HTML
- No vendor prefixes (use Autoprefixer)
