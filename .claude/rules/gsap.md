# GSAP — Animation Conventions

## Setup

- Register plugins at app entry: gsap.registerPlugin(ScrollTrigger, SplitText)
- Import only needed plugins — no full bundle

## Timelines

- Use gsap.timeline() for sequenced animations
- Name timelines for debugging: gsap.timeline({ id: 'hero-intro' })
- Return timeline from functions for composition
- Use defaults for shared properties: timeline({ defaults: { ease: 'power2.out' } })

## ScrollTrigger

- One ScrollTrigger per section — not per element
- Use scrub for scroll-linked, toggleActions for triggered
- Set markers: true during development, remove in production
- Batch similar animations with ScrollTrigger.batch()
- Clean up: trigger.kill() on unmount / route change

## Performance

- Animate transforms only: x, y, scale, rotation, opacity
- Never animate layout properties: width, height, top, left, margin
- Use will-change sparingly — GSAP handles it
- Force3D: true for GPU acceleration (default)
- Reduce motion: check prefers-reduced-motion before animating

## Cleanup

- Always kill animations on component unmount
- Use gsap.context() in React/Vue for automatic cleanup
- Revert ScrollTrigger instances on route changes
- No orphan tweens — store references and kill them

## Anti-patterns

- No conflicting tweens on the same property
- No gsap.to() in render loops — use gsap.ticker
- No inline styles that conflict with GSAP-managed properties
