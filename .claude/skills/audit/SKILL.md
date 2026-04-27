# /audit [scope?] [--a11y|--perf|--seo|--responsive|--all]

Quality audit: accessibility, performance, SEO, responsive — or all at once.

Default: `/audit` runs all checks. Use flags to focus: `/audit --a11y`, `/audit --perf`.

## Accessibility (WCAG 2.1 AA)

1. Semantic HTML (landmarks, headings, lists)
2. Keyboard navigation (Tab, Enter, Escape, Arrows)
3. Screen reader (aria-labels, roles, live regions)
4. Color contrast (4.5:1 text, 3:1 large)
5. Focus indicators (:focus-visible)
6. Forms (labels, errors, required fields)

## Performance (Core Web Vitals)

1. LCP < 2.5s — preload hero images/fonts
2. CLS < 0.1 — explicit dimensions on images/videos
3. INP < 200ms — no long tasks > 50ms
4. Bundle size — tree-shaking, lazy loading
5. Assets — WebP/AVIF, font-display: swap

## SEO

1. Meta tags: title (50-60 chars), description (120-155 chars)
2. Open Graph + Twitter Card
3. Canonical URLs, sitemap.xml, robots.txt
4. Heading hierarchy, alt text, internal links
5. Structured data (JSON-LD)

## Responsive

1. Mobile (320-480px), Tablet (768-1024px), Desktop (1280px+)
2. No horizontal scroll, content reflows
3. Touch targets >= 44x44px
4. Fluid typography (clamp)
5. Mobile menu accessible

## Output

| Priority | Category | Element | Issue | Fix |

P1 (blocker) > P2 (should fix) > P3 (enhancement)

End with: score per category + top 3 quick wins.
