# Performance — Core Web Vitals

## LCP (Largest Contentful Paint) < 2.5s

- Preload hero images and critical fonts
- Use next/image or <img> with srcset for responsive images
- Inline critical CSS, defer non-critical
- Avoid render-blocking scripts in <head>

## CLS (Cumulative Layout Shift) < 0.1

- Set explicit width/height on all images and videos
- Reserve space for dynamic content (skeleton screens)
- Avoid inserting content above existing content
- Use transform animations, not layout properties

## INP (Interaction to Next Paint) < 200ms

- Debounce expensive event handlers
- Use requestAnimationFrame for visual updates
- Break long tasks with scheduler.yield() or setTimeout
- Keep JavaScript execution < 50ms per task

## Bundle Size

- Tree-shake: use named imports, not namespace imports
- Lazy load below-the-fold components (React.lazy, dynamic import)
- Analyze bundle: no duplicate dependencies
- Code split by route

## Assets

- Images: WebP/AVIF with fallback, appropriate sizes
- Fonts: font-display: swap, subset to used characters
- Compress: gzip/brotli for all text assets
