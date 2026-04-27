# Astro — Project Conventions

## Architecture

- Zero client JS by default — no client:\* unless interactive
- Content Collections for structured content (MDX, Markdown)
- Static output (prerender) unless dynamic route needed
- Islands architecture: isolate interactive components

## Components

- .astro for static components (preferred)
- client:load only for immediately interactive elements
- client:visible for below-the-fold interactivity
- client:idle for non-critical interactivity
- Never client:only unless SSR is impossible

## Content Collections

- Define schema in src/content/config.ts with Zod
- Query with getCollection() / getEntry()
- Validate frontmatter types strictly
- Slugs in kebab-case

## Styling

- Scoped <style> in .astro components (default)
- Global styles in src/styles/ imported by layouts
- Use define:vars for passing props to styles
- No inline styles — use classes or CSS variables

## Routing

- File-based routing in src/pages/
- Dynamic routes: [param].astro, [...slug].astro
- Use getStaticPaths() for dynamic routes in static mode
- Prefer content collections over manual routing

## Performance

- Inline critical CSS (Astro does this automatically)
- Use <Image /> component for optimized images
- Preload critical assets in <head>
- Keep island count minimal per page
