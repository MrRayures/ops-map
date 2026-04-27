# Tailwind — Project Conventions

## Utility-First

- Use utility classes directly in templates
- Extract to @apply only after 3+ identical patterns
- Never mix Tailwind utilities with custom CSS for the same property

## Design Tokens

- Define ALL values in tailwind.config — never hardcode
- Use theme() in custom CSS when needed
- Extend default theme, don't override

## Responsive

- Mobile-first: sm: md: lg: xl: 2xl:
- Group responsive variants together per element
- Use container queries where applicable

## Components

- Use @apply for component base styles only
- Dynamic styles: use class binding, not inline styles
- Document variants in component comments

## Dark Mode

- Use dark: variant consistently
- Test both modes for every component
