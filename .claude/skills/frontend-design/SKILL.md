# /design [description]

Create a distinctive, production-grade frontend interface.

## Workflow

### 1. Understand

- Parse the description: what type of UI (page, component, section)?
- Identify the target: marketing, app, dashboard, landing?
- Note constraints: responsive, a11y, existing design system?

### 2. Design Decisions

- Choose a visual direction: clean/minimal, bold/expressive, editorial, glassmorphism
- Define spacing rhythm, color palette, typography scale
- Plan responsive behavior (mobile-first)

### 3. Build

- Write semantic HTML structure first
- Apply styles using project conventions (SCSS/Tailwind/CSS)
- Add micro-interactions: hover states, transitions, focus styles
- Ensure keyboard accessibility throughout

### 4. Polish

- Verify visual consistency and alignment
- Test responsive breakpoints
- Check color contrast (WCAG AA minimum)
- Add loading/empty/error states if applicable

## Rules

- Never use generic AI aesthetics (gradient blobs, excessive shadows)
- Prioritize readability and usability over decoration
- Every element must be purposeful — no filler
- Use real-world content, not Lorem ipsum
- Respect the existing design system if one exists
