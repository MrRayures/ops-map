# Midnight Tactical Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Midnight Tactical design system for ops-map — Tailwind v4 `@theme` tokens, signature components (utility-first + 3 BEM classes), a `/styleguide` catalogue, and a 1-for-1 refactor of the existing map editor screen onto the new palette.

**Architecture:** Tokens via `@theme` in `src/styles/tokens.css` with a `surface-` / `fg-` / `line-` naming convention to avoid Tailwind v4 utility redundancy. Non-Tailwind variables (brackets, grid, overlay HUD) live in `:root` in `primitives.css`. Components split across `src/components/ui/*.astro` (utility-first) and `src/styles/components/*.css` (BEM-flat for the 3 pieces with composed pseudo-elements / glow effects). The styleguide proves tokens visually before the refactor consumes them.

**Tech Stack:** Astro 6, Tailwind CSS v4 (CSS-first via `@tailwindcss/vite`), TypeScript strict, Leaflet 1.9, `@fontsource-variable/inter` + `@fontsource-variable/jetbrains-mono`.

**Testing approach:** Per the spec, **no automated tests** — there is no runner configured in this stack and the deliverable is visual. Each task ends with `npm run dev` (or `npm run build` for non-visual changes) + a manual visual / grep verification, then a commit. Engineers should keep `dev` running in a side terminal throughout.

**Reference spec:** [docs/superpowers/specs/2026-04-27-midnight-tactical-design-system.md](../specs/2026-04-27-midnight-tactical-design-system.md)

---

## File Structure

**Created:**

```
src/styles/tokens.css                       — @theme block, all colors/radii/fonts/shadows
src/styles/primitives.css                   — :root non-Tailwind vars + html reset + reduced-motion
src/styles/components/corner-brackets.css   — .c-corner-brackets (HUD frame)
src/styles/components/grid-overlay.css      — .c-grid-overlay (tactical grid background)
src/styles/components/pin.css               — .c-pin + .is-team-* / .is-objective / etc.
src/components/ui/Button.astro              — primary | secondary | ghost × sm | md
src/components/ui/Card.astro                — header / default / footer slots
src/components/ui/Badge.astro               — live | team | status variants
src/components/ui/Overlay.astro             — HUD monospace block
src/pages/styleguide.astro                  — catalogue, sections A–H
DESIGN_SYSTEM.md                            — root-level doc summarizing palette + conventions
```

**Modified:**

```
package.json                       — add @fontsource-variable/inter + jetbrains-mono
src/styles/global.css              — chain @import "tailwindcss" + tokens + fonts + primitives + components
src/components/Sidebar.astro       — slate/emerald → surface/fg/line/accent
src/components/PanelGroup.astro    — same mapping
src/components/AddressSearch.astro — same mapping
src/pages/index.astro              — body classes refactor + wrap <main> in .c-corner-brackets
```

---

## Phase 1 — Foundation (tokens, fonts, reset)

### Task 1: Pre-flight — verify baseline dev/build works

**Files:** none (verification only)

- [ ] **Step 1: Verify dependencies are installed**

Run:

```bash
npm install
```

Expected: completes without errors. `node_modules/` exists. (Skip if already installed; the `package-lock.json` already exists in the repo.)

- [ ] **Step 2: Verify dev server starts on the current (pre-refactor) state**

Run:

```bash
npm run dev
```

Expected: Astro starts on `http://localhost:4321` (or next available port). Open in browser — you should see the existing dark slate sidebar with emerald active state. Note the current visual baseline mentally (we'll compare after the refactor). Stop the dev server with `Ctrl+C` once verified.

- [ ] **Step 3: Verify build is clean**

Run:

```bash
npm run build
```

Expected: build completes without errors. Output goes to `dist/`.

This task does NOT produce a commit — it's a sanity check only.

---

### Task 2: Install fontsource variable fonts

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install the two variable font packages**

Run:

```bash
npm install @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

Expected: both added to `dependencies` in `package.json`. `package-lock.json` updated.

- [ ] **Step 2: Verify the font files are present in `node_modules`**

Run:

```bash
ls node_modules/@fontsource-variable/inter/files | head -5
ls node_modules/@fontsource-variable/jetbrains-mono/files | head -5
```

Expected: both directories exist and contain `.woff2` files (variable axis files). The exact names vary by version — just confirm `.woff2` files exist.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add Inter Variable + JetBrains Mono Variable

Self-hosted variable fonts for the Midnight Tactical design system.
Inter for sans content, JetBrains Mono for HUD overlays (timers,
coordinates, sector identifiers)."
```

---

### Task 3: Create `tokens.css` with the full `@theme` block

**Files:**

- Create: `src/styles/tokens.css`

- [ ] **Step 1: Create the file with all token declarations**

Create `src/styles/tokens.css` with exactly this content:

```css
@theme {
  /* Surfaces */
  --color-surface-base: #0f1419;
  --color-surface-card: #1a2230;
  --color-surface-elevated: #2a3548;

  /* Lines */
  --color-line-subtle: #1f2937;
  --color-line-default: #2a3548;

  /* Foreground (texte) */
  --color-fg-primary: #e8ecf1;
  --color-fg-secondary: #9aa5b4;
  --color-fg-muted: #6b7785;

  /* Accent signature */
  --color-accent: #ffb627;
  --color-accent-hover: #ffc547;
  --color-accent-on: #4a3300;

  /* Teams / factions */
  --color-team-red: #c8412c;
  --color-team-blue: #2b6a8f;
  --color-team-green: #5c8a3a;
  --color-team-purple: #8b4faa;
  --color-team-stroke: #e8e4d9;

  /* Markers tactiques */
  --color-marker-objective: #ff6b2b;
  --color-marker-spawn: #3da88c;
  --color-marker-danger: #b83838;
  --color-marker-cover: #6b5d47;

  /* Sémantique UI */
  --color-success: #3da88c;
  --color-warning: #ffb627;
  --color-danger: #ff4d4d;
  --color-info: #4a9eff;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadows / glows */
  --shadow-glow-accent: 0 0 20px rgba(255, 182, 39, 0.25);
  --shadow-glow-objective: 0 0 12px rgba(255, 107, 43, 0.6);

  /* Fonts */
  --font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

- [ ] **Step 2: Verify the file is syntactically valid by running the build**

Run:

```bash
npm run build
```

Expected: build completes without errors. (At this point the file isn't imported anywhere yet, so it has no runtime effect — we're just verifying CSS syntax.)

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat(design): add Midnight Tactical @theme tokens

Defines surface/line/fg/accent/team/marker/semantic color tokens
plus radii, shadows, and font stacks. The @theme directive makes
every token available both as CSS variable and Tailwind utility
(bg-surface-base, text-fg-primary, border-line-default, etc)."
```

---

### Task 4: Create `primitives.css`

**Files:**

- Create: `src/styles/primitives.css`

- [ ] **Step 1: Create the file with non-Tailwind variables, html base, and reduced-motion query**

Create `src/styles/primitives.css` with exactly this content:

```css
:root {
  /* Brackets HUD (consumed by .c-corner-brackets) */
  --bracket-color: var(--color-accent);
  --bracket-size: 16px;
  --bracket-thickness: 2px;
  --bracket-offset: 8px;

  /* Grille tactique (consumed by .c-grid-overlay) */
  --grid-line: rgba(255, 182, 39, 0.07);
  --grid-cell: 32px;

  /* Overlay HUD (consumed by Overlay.astro) */
  --overlay-bg: rgba(15, 20, 25, 0.9);
}

html {
  color-scheme: dark;
  background: var(--color-surface-base);
  color: var(--color-fg-primary);
  font-family: var(--font-sans);
}

:where(*, *::before, *::after) {
  box-sizing: border-box;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify build is still clean**

Run:

```bash
npm run build
```

Expected: build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/primitives.css
git commit -m "feat(design): add primitives — non-Tailwind vars + base reset

Bracket / grid / overlay vars, html base styles (color-scheme dark,
default font + bg + fg), :where box-sizing reset, and a global
prefers-reduced-motion guard."
```

---

### Task 5: Wire `global.css` to import tokens, fonts, and primitives

**Files:**

- Modify: `src/styles/global.css`

- [ ] **Step 1: Replace the contents of `global.css`**

Current content (1 line):

```css
@import 'tailwindcss';
```

Replace the entire file with:

```css
@import 'tailwindcss';
@import './tokens.css';

@import '@fontsource-variable/inter';
@import '@fontsource-variable/jetbrains-mono';

@import './primitives.css';
```

- [ ] **Step 2: Run dev server and visually confirm the baseline page now uses the new tokens at the html level**

Run:

```bash
npm run dev
```

Open `http://localhost:4321`. Expected:

- Background is now `#0f1419` (very dark blue-black) instead of slate-950.
- Default font is Inter Variable (visible if you inspect computed styles, or compare to the previous system stack).
- The sidebar / panel / map still render — but with the OLD slate/emerald classes still in place, so colors are mostly the legacy ones. That's expected. We'll refactor those in Phase 5.

Open devtools → Computed → on `<html>`, confirm:

- `background-color: rgb(15, 20, 25)` (or hex `#0f1419`)
- `font-family` includes `"Inter Variable"`

- [ ] **Step 3: Run build to confirm no Tailwind compilation errors with the new imports**

Run:

```bash
npm run build
```

Expected: build completes without errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(design): chain tokens + fonts + primitives in global.css

Order: tailwindcss engine, then @theme tokens, then variable font
faces, then html reset / non-Tailwind vars. The body of the app
now uses surface-base / fg-primary / Inter at the html level."
```

---

## Phase 2 — Utility-first components (`src/components/ui/`)

### Task 6: Create `Button.astro`

**Files:**

- Create: `src/components/ui/Button.astro`

- [ ] **Step 1: Create the file**

Create `src/components/ui/Button.astro` with exactly this content:

```astro
---
type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

interface Props {
  variant?: Variant;
  size?: Size;
  type?: "button" | "submit" | "reset";
  href?: string;
  disabled?: boolean;
  class?: string;
  "aria-label"?: string;
}

const {
  variant = "primary",
  size = "md",
  type = "button",
  href,
  disabled,
  class: extraClass,
  "aria-label": ariaLabel,
} = Astro.props;

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const variantClass: Record<Variant, string> = {
  primary: "bg-accent text-accent-on hover:bg-accent-hover",
  secondary:
    "border border-line-default bg-transparent text-fg-primary hover:bg-surface-elevated",
  ghost:
    "bg-transparent text-fg-secondary hover:bg-surface-elevated hover:text-fg-primary",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

const classes = [base, variantClass[variant], sizeClass[size], extraClass]
  .filter(Boolean)
  .join(" ");
---

{
  href ? (
    <a class={classes} href={href} aria-label={ariaLabel}>
      <slot />
    </a>
  ) : (
    <button class={classes} type={type} disabled={disabled} aria-label={ariaLabel}>
      <slot />
    </button>
  )
}
```

- [ ] **Step 2: Verify build is still clean**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Button.astro
git commit -m "feat(ui): add Button component (primary/secondary/ghost × sm/md)

Switches between <a> and <button> based on href prop. Focus ring
uses outline-accent. Disabled state lowers opacity."
```

---

### Task 7: Create `Card.astro`

**Files:**

- Create: `src/components/ui/Card.astro`

- [ ] **Step 1: Create the file**

Create `src/components/ui/Card.astro` with exactly this content:

```astro
---
interface Props {
  class?: string;
}

const { class: extraClass } = Astro.props;

const classes = [
  "rounded-md border border-line-default bg-surface-card p-4",
  extraClass,
]
  .filter(Boolean)
  .join(" ");
---

<article class={classes}>
  {
    Astro.slots.has("header") && (
      <header class="mb-3 border-b border-line-subtle pb-3">
        <slot name="header" />
      </header>
    )
  }

  <slot />

  {
    Astro.slots.has("footer") && (
      <footer class="mt-3 border-t border-line-subtle pt-3">
        <slot name="footer" />
      </footer>
    )
  }
</article>
```

- [ ] **Step 2: Verify build is clean**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Card.astro
git commit -m "feat(ui): add Card component with optional header/footer slots

Default surface is bg-surface-card with line-default border and
rounded-md (8px). Header and footer slots get a subtle line-subtle
divider when present."
```

---

### Task 8: Create `Badge.astro`

**Files:**

- Create: `src/components/ui/Badge.astro`

- [ ] **Step 1: Create the file**

Create `src/components/ui/Badge.astro` with exactly this content:

```astro
---
type Team = "red" | "blue" | "green" | "purple";
type Status = "success" | "warning" | "danger" | "info";
type Variant = "live" | "team" | "status";

interface Props {
  variant: Variant;
  team?: Team;
  status?: Status;
  class?: string;
}

const { variant, team, status, class: extraClass } = Astro.props;

const base = "inline-flex items-center rounded-sm px-2 py-0.5 text-xs";

const liveClass =
  "border border-accent bg-transparent font-mono uppercase tracking-[0.1em] text-accent";

const teamClass: Record<Team, string> = {
  red: "bg-team-red text-fg-primary",
  blue: "bg-team-blue text-fg-primary",
  green: "bg-team-green text-fg-primary",
  purple: "bg-team-purple text-fg-primary",
};

const statusClass: Record<Status, string> = {
  success: "border border-success/30 bg-success/15 text-success",
  warning: "border border-warning/30 bg-warning/15 text-warning",
  danger: "border border-danger/30 bg-danger/15 text-danger",
  info: "border border-info/30 bg-info/15 text-info",
};

let variantClass = "";
if (variant === "live") {
  variantClass = liveClass;
} else if (variant === "team" && team) {
  variantClass = teamClass[team];
} else if (variant === "status" && status) {
  variantClass = statusClass[status];
}

const classes = [base, variantClass, extraClass].filter(Boolean).join(" ");
---

<span class={classes}>
  <slot />
</span>
```

- [ ] **Step 2: Verify build is clean**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Badge.astro
git commit -m "feat(ui): add Badge component (live/team/status variants)

live: yellow outline + monospace uppercase, used for ACTIVE/LIVE
indicators. team: solid faction color. status: tinted background +
border + matching text color."
```

---

### Task 9: Create `Overlay.astro`

**Files:**

- Create: `src/components/ui/Overlay.astro`

- [ ] **Step 1: Create the file**

Create `src/components/ui/Overlay.astro` with exactly this content:

```astro
---
interface Props {
  class?: string;
}

const { class: extraClass } = Astro.props;

const classes = [
  "border-l-2 border-accent bg-[var(--overlay-bg)] p-3 font-mono text-fg-primary",
  extraClass,
]
  .filter(Boolean)
  .join(" ");
---

<aside class={classes}>
  <slot />
</aside>
```

- [ ] **Step 2: Verify build is clean**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Overlay.astro
git commit -m "feat(ui): add Overlay HUD component

Translucent overlay with 2px accent left border and monospace
content — used for tactical overlays (timer, coordinates, sector
labels)."
```

---

## Phase 3 — BEM components (`src/styles/components/`)

### Task 10: Create `corner-brackets.css`

**Files:**

- Create: `src/styles/components/corner-brackets.css`

- [ ] **Step 1: Create the file**

Create `src/styles/components/corner-brackets.css` with exactly this content:

```css
.c-corner-brackets {
  position: relative;
}

.c-corner-brackets::before,
.c-corner-brackets::after,
.c-corner-brackets > .c-corner-brackets-bl,
.c-corner-brackets > .c-corner-brackets-br {
  content: '';
  position: absolute;
  width: var(--bracket-size);
  height: var(--bracket-size);
  pointer-events: none;
}

.c-corner-brackets::before {
  top: var(--bracket-offset);
  left: var(--bracket-offset);
  border-top: var(--bracket-thickness) solid var(--bracket-color);
  border-left: var(--bracket-thickness) solid var(--bracket-color);
}

.c-corner-brackets::after {
  top: var(--bracket-offset);
  right: var(--bracket-offset);
  border-top: var(--bracket-thickness) solid var(--bracket-color);
  border-right: var(--bracket-thickness) solid var(--bracket-color);
}

.c-corner-brackets > .c-corner-brackets-bl {
  bottom: var(--bracket-offset);
  left: var(--bracket-offset);
  border-bottom: var(--bracket-thickness) solid var(--bracket-color);
  border-left: var(--bracket-thickness) solid var(--bracket-color);
}

.c-corner-brackets > .c-corner-brackets-br {
  bottom: var(--bracket-offset);
  right: var(--bracket-offset);
  border-bottom: var(--bracket-thickness) solid var(--bracket-color);
  border-right: var(--bracket-thickness) solid var(--bracket-color);
}

.c-corner-brackets.is-active::before,
.c-corner-brackets.is-active::after,
.c-corner-brackets.is-active > .c-corner-brackets-bl,
.c-corner-brackets.is-active > .c-corner-brackets-br {
  border-width: calc(var(--bracket-thickness) * 1.5);
  filter: drop-shadow(var(--shadow-glow-accent));
}
```

**Note on the implementation choice:** CSS pseudo-elements only give us 2 corners per element. The bottom corners are placed on dedicated child spans `.c-corner-brackets-bl` and `.c-corner-brackets-br`. Consumers of `.c-corner-brackets` must include these two spans inside the wrapper. This is documented in DESIGN_SYSTEM.md (Task 22).

- [ ] **Step 2: Verify build is clean**

Run:

```bash
npm run build
```

Expected: build succeeds. (The file isn't imported yet — Task 13 wires it in.)

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/corner-brackets.css
git commit -m "feat(design): add .c-corner-brackets HUD frame

Top corners use ::before/::after, bottom corners use child spans
(.c-corner-brackets-bl / -br) since pseudo-elements give us only
two slots per element. .is-active modifier thickens borders +
adds an accent glow."
```

---

### Task 11: Create `grid-overlay.css`

**Files:**

- Create: `src/styles/components/grid-overlay.css`

- [ ] **Step 1: Create the file**

Create `src/styles/components/grid-overlay.css` with exactly this content:

```css
.c-grid-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(to right, var(--grid-line) 0 1px, transparent 1px var(--grid-cell)),
    repeating-linear-gradient(to bottom, var(--grid-line) 0 1px, transparent 1px var(--grid-cell));
}
```

- [ ] **Step 2: Verify build is clean**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/grid-overlay.css
git commit -m "feat(design): add .c-grid-overlay tactical grid

Overlays a 32px-cell grid using repeating-linear-gradient with
a very transparent yellow line color. pointer-events:none so it
never blocks interactions."
```

---

### Task 12: Create `pin.css`

**Files:**

- Create: `src/styles/components/pin.css`

- [ ] **Step 1: Create the file**

Create `src/styles/components/pin.css` with exactly this content:

```css
.c-pin {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-team-stroke);
  background: transparent;
}

.c-pin.is-team-red {
  background: var(--color-team-red);
}

.c-pin.is-team-blue {
  background: var(--color-team-blue);
}

.c-pin.is-team-green {
  background: var(--color-team-green);
}

.c-pin.is-team-purple {
  background: var(--color-team-purple);
}

.c-pin.is-objective {
  background: var(--color-marker-objective);
  box-shadow: var(--shadow-glow-objective);
}

.c-pin.is-spawn {
  background: var(--color-marker-spawn);
}

.c-pin.is-danger {
  background: var(--color-marker-danger);
}

.c-pin.is-cover {
  background: var(--color-marker-cover);
}
```

- [ ] **Step 2: Verify build is clean**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/styles/components/pin.css
git commit -m "feat(design): add .c-pin component

Solid circle, 16px, 2px off-white stroke. Modifiers: 4 team colors
(.is-team-red/blue/green/purple) and 4 tactical markers
(.is-objective/spawn/danger/cover). Only .is-objective gets the
glow per the brief."
```

---

### Task 13: Wire BEM components into `global.css`

**Files:**

- Modify: `src/styles/global.css`

- [ ] **Step 1: Append the BEM component imports**

Read the current `global.css` (set by Task 5) — it currently ends with:

```css
@import './primitives.css';
```

Replace the entire file with:

```css
@import 'tailwindcss';
@import './tokens.css';

@import '@fontsource-variable/inter';
@import '@fontsource-variable/jetbrains-mono';

@import './primitives.css';

@import './components/corner-brackets.css';
@import './components/grid-overlay.css';
@import './components/pin.css';
```

- [ ] **Step 2: Verify build picks up the BEM CSS**

Run:

```bash
npm run build
```

Expected: build succeeds. The output CSS (in `dist/_astro/*.css`) should now contain `.c-corner-brackets`, `.c-grid-overlay`, `.c-pin` rules. You can confirm with:

```bash
grep -l "c-corner-brackets" dist/_astro/*.css
```

Expected: at least one file matches.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(design): chain BEM components in global.css

corner-brackets, grid-overlay, and pin are now part of the bundle
and ready to be consumed by /styleguide and the refactored map
screen."
```

---

## Phase 4 — Styleguide page

### Task 14: Create `/styleguide` skeleton + §A Palette + §B Typographie

**Files:**

- Create: `src/pages/styleguide.astro`

- [ ] **Step 1: Create the styleguide page with the layout shell, palette, and typography sections**

Create `src/pages/styleguide.astro` with exactly this content:

```astro
---
import "../styles/global.css";

const surfaces = [
  { token: "--color-surface-base", utility: "bg-surface-base", hex: "#0F1419" },
  { token: "--color-surface-card", utility: "bg-surface-card", hex: "#1A2230" },
  {
    token: "--color-surface-elevated",
    utility: "bg-surface-elevated",
    hex: "#2A3548",
  },
];

const lines = [
  { token: "--color-line-subtle", utility: "border-line-subtle", hex: "#1F2937" },
  {
    token: "--color-line-default",
    utility: "border-line-default",
    hex: "#2A3548",
  },
];

const fg = [
  { token: "--color-fg-primary", utility: "text-fg-primary", hex: "#E8ECF1" },
  { token: "--color-fg-secondary", utility: "text-fg-secondary", hex: "#9AA5B4" },
  { token: "--color-fg-muted", utility: "text-fg-muted", hex: "#6B7785" },
];

const accent = [
  { token: "--color-accent", utility: "bg-accent", hex: "#FFB627" },
  { token: "--color-accent-hover", utility: "bg-accent-hover", hex: "#FFC547" },
  { token: "--color-accent-on", utility: "text-accent-on", hex: "#4A3300" },
];

const teams = [
  { token: "--color-team-red", utility: "bg-team-red", hex: "#C8412C" },
  { token: "--color-team-blue", utility: "bg-team-blue", hex: "#2B6A8F" },
  { token: "--color-team-green", utility: "bg-team-green", hex: "#5C8A3A" },
  { token: "--color-team-purple", utility: "bg-team-purple", hex: "#8B4FAA" },
];

const markers = [
  {
    token: "--color-marker-objective",
    utility: "bg-marker-objective",
    hex: "#FF6B2B",
  },
  { token: "--color-marker-spawn", utility: "bg-marker-spawn", hex: "#3DA88C" },
  { token: "--color-marker-danger", utility: "bg-marker-danger", hex: "#B83838" },
  { token: "--color-marker-cover", utility: "bg-marker-cover", hex: "#6B5D47" },
];

const semantic = [
  { token: "--color-success", utility: "bg-success", hex: "#3DA88C" },
  { token: "--color-warning", utility: "bg-warning", hex: "#FFB627" },
  { token: "--color-danger", utility: "bg-danger", hex: "#FF4D4D" },
  { token: "--color-info", utility: "bg-info", hex: "#4A9EFF" },
];

const swatchGroups = [
  { title: "Surfaces", items: surfaces, kind: "bg" as const },
  { title: "Lignes", items: lines, kind: "border" as const },
  { title: "Foreground (texte)", items: fg, kind: "fg" as const },
  { title: "Accent signature", items: accent, kind: "bg" as const },
  { title: "Équipes / factions", items: teams, kind: "bg" as const },
  { title: "Markers tactiques", items: markers, kind: "bg" as const },
  { title: "Sémantique UI", items: semantic, kind: "bg" as const },
];
---

<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Styleguide — Midnight Tactical</title>
  </head>
  <body class="bg-surface-base text-fg-primary">
    <main class="mx-auto max-w-[1200px] px-6 py-10">
      <header class="mb-10">
        <p class="font-mono text-xs tracking-[0.2em] text-accent uppercase">
          Field Ops · Design System
        </p>
        <h1 class="mt-2 text-3xl font-semibold">Midnight Tactical</h1>
        <p class="mt-2 max-w-prose text-fg-secondary">
          Catalogue visuel — tokens, typographie, composants signature et effets.
          Référence vivante de la palette en situation.
        </p>
      </header>

      <section class="border-t border-line-subtle py-10" aria-labelledby="sec-palette">
        <h2 id="sec-palette" class="mb-6 text-xl font-semibold">A. Palette</h2>

        {
          swatchGroups.map((group) => (
            <div class="mb-8">
              <h3 class="mb-3 font-mono text-xs tracking-wider text-fg-secondary uppercase">
                {group.title}
              </h3>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <div class="flex items-center gap-3 rounded-md border border-line-default bg-surface-card p-3">
                    {group.kind === "bg" && (
                      <span
                        class="block size-12 shrink-0 rounded-sm border border-line-subtle"
                        style={`background:${item.hex}`}
                        aria-hidden="true"
                      />
                    )}
                    {group.kind === "border" && (
                      <span
                        class="block size-12 shrink-0 rounded-sm bg-surface-base"
                        style={`border:2px solid ${item.hex}`}
                        aria-hidden="true"
                      />
                    )}
                    {group.kind === "fg" && (
                      <span
                        class="grid size-12 shrink-0 place-items-center rounded-sm border border-line-subtle bg-surface-base font-semibold"
                        style={`color:${item.hex}`}
                        aria-hidden="true"
                      >
                        Aa
                      </span>
                    )}
                    <div class="min-w-0">
                      <p class="font-mono text-xs text-fg-primary">{item.token}</p>
                      <p class="font-mono text-xs text-fg-secondary">{item.utility}</p>
                      <p class="font-mono text-xs text-fg-muted">{item.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        }
      </section>

      <section class="border-t border-line-subtle py-10" aria-labelledby="sec-type">
        <h2 id="sec-type" class="mb-6 text-xl font-semibold">B. Typographie</h2>

        <div class="grid gap-6 lg:grid-cols-2">
          <article class="rounded-md border border-line-default bg-surface-card p-5">
            <h3 class="mb-3 font-mono text-xs tracking-wider text-fg-secondary uppercase">
              Sans · Inter Variable
            </h3>
            <p class="text-3xl font-semibold">Opération nocturne</p>
            <p class="mt-2 text-fg-secondary">
              Le brouillard couvre la zone de capture. Équipe rouge engage en
              flanc nord.
            </p>
            <ul class="mt-4 space-y-1 text-sm text-fg-muted">
              <li>text-xs · 12px</li>
              <li>text-sm · 14px</li>
              <li>text-base · 16px</li>
              <li>text-lg · 18px</li>
              <li>text-xl · 20px</li>
            </ul>
          </article>

          <article class="rounded-md border border-line-default bg-surface-card p-5">
            <h3 class="mb-3 font-mono text-xs tracking-wider text-fg-secondary uppercase">
              Mono · JetBrains Mono Variable
            </h3>
            <p class="font-mono text-2xl">SECTOR · ALPHA-7</p>
            <p class="mt-2 font-mono text-sm text-fg-secondary">
              48.8566° N · 2.3522° E
            </p>
            <p class="mt-1 font-mono text-sm text-fg-muted">T-00:14:32</p>
            <p class="mt-4 font-mono text-xs tracking-[0.1em] text-accent uppercase">
              · Live transmission ·
            </p>
          </article>
        </div>
      </section>
    </main>
  </body>
</html>
```

- [ ] **Step 2: Run dev and visually verify the styleguide loads with palette + typography**

Run:

```bash
npm run dev
```

Open `http://localhost:4321/styleguide`. Expected:

- Dark `#0F1419` background.
- "FIELD OPS · DESIGN SYSTEM" caption in monospace, yellow accent.
- "Midnight Tactical" h1 in Inter sans.
- Section A renders 7 sub-groups of swatches: surfaces, lines, foregrounds, accent, teams, markers, semantic. Each swatch shows a colored square (or outlined for lines, or "Aa" for fg), the token name, the Tailwind utility, and the hex.
- Section B shows two cards side-by-side: Inter sample and JetBrains Mono sample.

If colors don't render correctly, the `bg-surface-card` etc. utilities aren't being generated — likely a token-naming mismatch. Check `tokens.css` syntax.

- [ ] **Step 3: Verify build is clean**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/styleguide.astro
git commit -m "feat(styleguide): add /styleguide skeleton + §A Palette + §B Typographie

Renders all 7 token groups as swatch grids and two typography
samples (Inter sans + JetBrains Mono with HUD-style content).
Will grow with components in subsequent commits."
```

---

### Task 15: Add §C Buttons + §D Cards + §E Badges to `/styleguide`

**Files:**

- Modify: `src/pages/styleguide.astro`

- [ ] **Step 1: Add imports to the frontmatter**

Open `src/pages/styleguide.astro`. At the top of the frontmatter (after the `import "../styles/global.css";` line), add:

```ts
import Button from '../components/ui/Button.astro';
import Card from '../components/ui/Card.astro';
import Badge from '../components/ui/Badge.astro';
```

- [ ] **Step 2: Append three new sections inside `<main>`**

After the `</section>` that closes "B. Typographie" (the last section currently in the file), and before `</main>`, insert these three sections:

```astro
<section class="border-t border-line-subtle py-10" aria-labelledby="sec-buttons">
  <h2 id="sec-buttons" class="mb-6 text-xl font-semibold">C. Buttons</h2>

  <div class="grid gap-4 sm:grid-cols-3">
    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Primary
      </span>
      <div class="flex flex-col items-start gap-3">
        <Button variant="primary" size="md">Lancer la partie</Button>
        <Button variant="primary" size="sm">Sauvegarder</Button>
        <Button variant="primary" size="md" disabled>Désactivé</Button>
      </div>
    </Card>

    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Secondary
      </span>
      <div class="flex flex-col items-start gap-3">
        <Button variant="secondary" size="md">Annuler</Button>
        <Button variant="secondary" size="sm">Détails</Button>
        <Button variant="secondary" size="md" disabled>Désactivé</Button>
      </div>
    </Card>

    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Ghost
      </span>
      <div class="flex flex-col items-start gap-3">
        <Button variant="ghost" size="md">Plus d'options</Button>
        <Button variant="ghost" size="sm">Réinitialiser</Button>
      </div>
    </Card>
  </div>

  <p class="mt-3 text-sm text-fg-muted">
    Tab pour visualiser le focus ring jaune (outline-accent).
  </p>
</section>

<section class="border-t border-line-subtle py-10" aria-labelledby="sec-cards">
  <h2 id="sec-cards" class="mb-6 text-xl font-semibold">D. Cards</h2>

  <div class="grid gap-4 lg:grid-cols-3">
    <Card>
      <p>Card minimale — fond surface-card, bordure line-default, radius-md.</p>
    </Card>

    <Card>
      <h3 slot="header" class="text-sm font-semibold text-fg-primary">
        Avec header
      </h3>
      <p class="text-fg-secondary">
        Le header est séparé par une bordure subtile et un padding contrôlé.
      </p>
    </Card>

    <Card>
      <h3 slot="header" class="text-sm font-semibold text-fg-primary">
        Header + footer
      </h3>
      <p class="text-fg-secondary">
        Slots header et footer peuvent coexister.
      </p>
      <span slot="footer" class="font-mono text-xs text-fg-muted">
        Footer · métadonnées
      </span>
    </Card>
  </div>
</section>

<section class="border-t border-line-subtle py-10" aria-labelledby="sec-badges">
  <h2 id="sec-badges" class="mb-6 text-xl font-semibold">E. Badges</h2>

  <div class="grid gap-4 lg:grid-cols-3">
    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Live indicator
      </span>
      <Badge variant="live">Live</Badge>
    </Card>

    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Équipes
      </span>
      <div class="flex flex-wrap gap-2">
        <Badge variant="team" team="red">Rouge</Badge>
        <Badge variant="team" team="blue">Bleu</Badge>
        <Badge variant="team" team="green">Vert</Badge>
        <Badge variant="team" team="purple">Violet</Badge>
      </div>
    </Card>

    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Status sémantique
      </span>
      <div class="flex flex-wrap gap-2">
        <Badge variant="status" status="success">Succès</Badge>
        <Badge variant="status" status="warning">Attention</Badge>
        <Badge variant="status" status="danger">Erreur</Badge>
        <Badge variant="status" status="info">Info</Badge>
      </div>
    </Card>
  </div>
</section>
```

- [ ] **Step 3: Verify dev render**

Run `npm run dev`. Open `/styleguide` and scroll to the new sections. Expected:

- §C: 3 cards side-by-side, each showing primary / secondary / ghost button variants in two sizes + disabled state. Tab through them — yellow focus ring should appear.
- §D: 3 card examples (minimal, with header, with header+footer).
- §E: Live badge (yellow outline + uppercase mono), 4 team badges (solid colors), 4 status badges (tinted).

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/styleguide.astro
git commit -m "feat(styleguide): add §C Buttons + §D Cards + §E Badges sections

Showcases all variants of the utility-first components (Button,
Card, Badge) with usage examples in French context."
```

---

### Task 16: Add §F Pins + §G Overlay + §H Effets to `/styleguide`

**Files:**

- Modify: `src/pages/styleguide.astro`

- [ ] **Step 1: Add the Overlay import**

Open `src/pages/styleguide.astro`. In the frontmatter, after the existing component imports, add:

```ts
import Overlay from '../components/ui/Overlay.astro';
```

- [ ] **Step 2: Append the three remaining sections inside `<main>`**

After the `</section>` that closes "E. Badges", before `</main>`, insert:

```astro
<section class="border-t border-line-subtle py-10" aria-labelledby="sec-pins">
  <h2 id="sec-pins" class="mb-6 text-xl font-semibold">F. Pins tactiques</h2>

  <div class="grid gap-4 lg:grid-cols-2">
    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Équipes
      </span>
      <div class="flex flex-wrap items-center gap-6">
        <span class="flex items-center gap-2">
          <span class="c-pin is-team-red" aria-hidden="true"></span>
          <span class="font-mono text-sm text-fg-secondary">Rouge</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="c-pin is-team-blue" aria-hidden="true"></span>
          <span class="font-mono text-sm text-fg-secondary">Bleu</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="c-pin is-team-green" aria-hidden="true"></span>
          <span class="font-mono text-sm text-fg-secondary">Vert</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="c-pin is-team-purple" aria-hidden="true"></span>
          <span class="font-mono text-sm text-fg-secondary">Violet</span>
        </span>
      </div>
    </Card>

    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Markers
      </span>
      <div class="flex flex-wrap items-center gap-6">
        <span class="flex items-center gap-2">
          <span class="c-pin is-objective" aria-hidden="true"></span>
          <span class="font-mono text-sm text-fg-secondary">Objectif</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="c-pin is-spawn" aria-hidden="true"></span>
          <span class="font-mono text-sm text-fg-secondary">Spawn</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="c-pin is-danger" aria-hidden="true"></span>
          <span class="font-mono text-sm text-fg-secondary">Danger</span>
        </span>
        <span class="flex items-center gap-2">
          <span class="c-pin is-cover" aria-hidden="true"></span>
          <span class="font-mono text-sm text-fg-secondary">Couvert</span>
        </span>
      </div>
    </Card>
  </div>
</section>

<section class="border-t border-line-subtle py-10" aria-labelledby="sec-overlay">
  <h2 id="sec-overlay" class="mb-6 text-xl font-semibold">G. Overlay HUD</h2>

  <div class="relative h-64 overflow-hidden rounded-md border border-line-default bg-surface-base">
    <div class="absolute top-4 left-4 max-w-xs">
      <Overlay>
        <p class="text-xs tracking-[0.1em] text-accent uppercase">· Active mission</p>
        <p class="mt-2 text-base">SECTOR ALPHA-7</p>
        <p class="mt-1 text-sm text-fg-secondary">48.8566° N · 2.3522° E</p>
        <p class="mt-1 text-sm text-fg-muted">T-00:14:32</p>
      </Overlay>
    </div>
  </div>

  <p class="mt-3 text-sm text-fg-muted">
    Bordure latérale gauche 2px accent, fond translucide, contenu monospace.
  </p>
</section>

<section class="border-t border-line-subtle py-10" aria-labelledby="sec-effects">
  <h2 id="sec-effects" class="mb-6 text-xl font-semibold">H. Effets HUD</h2>

  <div class="grid gap-4 lg:grid-cols-2">
    <div>
      <h3 class="mb-3 font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Corner brackets
      </h3>
      <div class="c-corner-brackets relative h-48 rounded-md border border-line-default bg-surface-card">
        <span class="c-corner-brackets-bl" aria-hidden="true"></span>
        <span class="c-corner-brackets-br" aria-hidden="true"></span>
        <p class="absolute inset-0 grid place-items-center font-mono text-sm text-fg-secondary">
          .c-corner-brackets
        </p>
      </div>
    </div>

    <div>
      <h3 class="mb-3 font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Grid overlay
      </h3>
      <div class="relative h-48 overflow-hidden rounded-md border border-line-default bg-surface-base">
        <div class="c-grid-overlay" aria-hidden="true"></div>
        <p class="absolute inset-0 grid place-items-center font-mono text-sm text-fg-secondary">
          .c-grid-overlay
        </p>
      </div>
    </div>

    <div>
      <h3 class="mb-3 font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Glow accent (focus)
      </h3>
      <div class="relative h-48 grid place-items-center rounded-md border border-line-default bg-surface-card">
        <button
          type="button"
          class="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-accent-on shadow-glow-accent"
        >
          État focus simulé
        </button>
      </div>
    </div>

    <div>
      <h3 class="mb-3 font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Brackets actifs
      </h3>
      <div class="c-corner-brackets is-active relative h-48 rounded-md border border-line-default bg-surface-card">
        <span class="c-corner-brackets-bl" aria-hidden="true"></span>
        <span class="c-corner-brackets-br" aria-hidden="true"></span>
        <p class="absolute inset-0 grid place-items-center font-mono text-sm text-fg-secondary">
          .c-corner-brackets.is-active
        </p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Run dev and visually verify**

Run `npm run dev`. Open `/styleguide` and scroll. Expected:

- §F: 4 team pins with white-cream stroke + 4 marker pins. The objective pin has a visible orange glow.
- §G: a "fake map" panel with an HUD overlay anchored top-left showing live mission text in monospace.
- §H: 4 effect demos — corner brackets (small yellow brackets in 4 corners of a card), grid overlay (faint yellow grid pattern), focus glow (button with yellow halo), active brackets (thicker brackets + glow).

If brackets only show in 2 corners (top), the `<span class="c-corner-brackets-bl">` and `-br` spans are missing — check the markup.

- [ ] **Step 4: Tab through the styleguide**

Tab through the page. Every interactive element (buttons in §C, anchors if any) should show the yellow `outline-accent` focus ring at 2px offset. Disabled buttons should not be focusable.

- [ ] **Step 5: Verify reduced motion**

In Chrome devtools: ⋯ → More tools → Rendering → "Emulate CSS media feature prefers-reduced-motion" → set to `reduce`. Reload `/styleguide`. The page should still render, with all transitions reduced to 0.01ms (per the rule in `primitives.css`).

- [ ] **Step 6: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/pages/styleguide.astro
git commit -m "feat(styleguide): add §F Pins + §G Overlay + §H Effets sections

Pins (4 teams + 4 markers, with objective glow), HUD overlay
positioned over a fake map panel, and 4 effect demos: corner
brackets (idle + active), grid overlay, focus glow."
```

---

## Phase 5 — Refactor existing screen

### Task 17: Refactor `Sidebar.astro`

**Files:**

- Modify: `src/components/Sidebar.astro`

- [ ] **Step 1: Read the current file as a baseline**

Read `src/components/Sidebar.astro` so you know exactly what's being changed (line ~25–118 contain the class-string constants and template).

- [ ] **Step 2: Replace the class-string constants and the H1 anchor**

In the frontmatter (lines ~24–28), replace:

```ts
const navButton =
  'group relative grid size-11 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-white aria-selected:bg-slate-800 aria-selected:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500';

const tooltip =
  'pointer-events-none absolute left-full top-1/2 z-10 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-100 shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100';
```

with:

```ts
const navButton =
  'group relative grid size-11 place-items-center rounded-sm text-fg-secondary transition-colors hover:bg-surface-elevated hover:text-fg-primary aria-selected:bg-surface-elevated aria-selected:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const tooltip =
  'pointer-events-none absolute left-full top-1/2 z-10 ml-3 -translate-y-1/2 whitespace-nowrap rounded-sm bg-surface-elevated px-2 py-1 font-mono text-xs tracking-wider text-fg-primary uppercase shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100';
```

- [ ] **Step 3: Replace the `<aside>` element classes**

Find:

```astro
<aside
  class="flex h-full w-16 shrink-0 flex-col items-center gap-2 border-r border-slate-800 bg-slate-950 py-3 text-slate-200"
  aria-label="Panneau latéral"
>
```

Replace with:

```astro
<aside
  class="flex h-full w-16 shrink-0 flex-col items-center gap-2 border-r border-line-default bg-surface-base py-3 text-fg-primary"
  aria-label="Panneau latéral"
>
```

- [ ] **Step 4: Replace the H1 anchor (the "O" logo)**

Find:

```astro
<a
  href="/"
  class="group relative grid size-10 place-items-center rounded-md bg-emerald-500 font-bold text-slate-950 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
  aria-label="ops-map — accueil"
>
  O
  <span aria-hidden="true" class={tooltip}>ops-map</span>
</a>
```

Replace with:

```astro
<a
  href="/"
  class="group relative grid size-10 place-items-center rounded-sm bg-accent font-mono font-bold text-accent-on uppercase outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
  aria-label="ops-map — accueil"
>
  O
  <span aria-hidden="true" class={tooltip}>ops-map</span>
</a>
```

- [ ] **Step 5: Replace the two divider divs**

Find both occurrences of:

```astro
<div class="my-1 h-px w-8 bg-slate-800" aria-hidden="true"></div>
```

```astro
<div
  class="mt-auto flex flex-col gap-1 border-t border-slate-800 pt-3"
```

```astro
<div
  class="flex flex-col gap-1 border-t border-slate-800 pt-3"
```

Replace `bg-slate-800` with `bg-line-default`, and `border-slate-800` with `border-line-default` in those three places.

- [ ] **Step 6: Run dev and visually verify**

Run `npm run dev`. Open `http://localhost:4321/`. Expected:

- Sidebar background is `#0F1419` (dark blue-black, not slate).
- The "O" logo block is now solid yellow `#FFB627` with dark brown text in monospace uppercase.
- Inactive tab icons are gray (`#9AA5B4`).
- The active tab (Adresse by default) has a darker background (`#2A3548`) and yellow icon (`#FFB627`).
- Hover state: tab background goes `#2A3548`, icon turns near-white (`#E8ECF1`).
- Tab the icons. Focus ring is yellow.

- [ ] **Step 7: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/Sidebar.astro
git commit -m "refactor(sidebar): migrate slate/emerald → Midnight Tactical tokens

1-for-1 mapping plus two HUD touches: the O logo is now monospace
uppercase, and tooltips use mono + tracking-wider for the tactical
HUD feel."
```

---

### Task 18: Refactor `PanelGroup.astro`

**Files:**

- Modify: `src/components/PanelGroup.astro`

- [ ] **Step 1: Replace the `<section>` classes**

Find:

```astro
<section
  id="panel-group"
  data-state="open"
  aria-label="Contenu du panneau actif"
  class="flex h-full w-80 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-200 transition-[width] duration-200 ease-out data-[state=closed]:w-0 data-[state=closed]:overflow-hidden data-[state=closed]:border-r-transparent"
>
```

Replace with:

```astro
<section
  id="panel-group"
  data-state="open"
  aria-label="Contenu du panneau actif"
  class="flex h-full w-80 shrink-0 flex-col border-r border-line-default bg-surface-card text-fg-primary transition-[width] duration-200 ease-out data-[state=closed]:w-0 data-[state=closed]:overflow-hidden data-[state=closed]:border-r-transparent"
>
```

- [ ] **Step 2: Replace the `<article>` classes**

Find:

```astro
class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-500"
```

Replace with:

```astro
class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
```

- [ ] **Step 3: Replace the `<h2>` panel title classes**

Find:

```astro
<h2 class="text-base font-semibold tracking-tight text-white">{panel.label}</h2>
```

Replace with:

```astro
<h2 class="text-base font-semibold tracking-tight text-fg-primary">{panel.label}</h2>
```

- [ ] **Step 4: Replace the `<legend>` classes**

Find:

```astro
<legend class="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
  Styles de carte
</legend>
```

Replace with:

```astro
<legend class="mb-2 font-mono text-xs font-semibold tracking-wider text-fg-secondary uppercase">
  Styles de carte
</legend>
```

(Note: added `font-mono` per the "labels uppercase passent en mono" HUD touch from the spec.)

- [ ] **Step 5: Replace the `<label>` classes for the radio rows**

Find:

```astro
<label class="flex cursor-pointer items-center gap-3 rounded-md border border-slate-800 px-3 py-2 text-sm transition-colors hover:border-slate-700 has-[:checked]:border-emerald-500 has-[:checked]:bg-slate-800 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-500">
```

Replace with:

```astro
<label class="flex cursor-pointer items-center gap-3 rounded-sm border border-line-default px-3 py-2 text-sm transition-colors has-[:checked]:border-accent has-[:checked]:bg-surface-elevated has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
```

(The `hover:border-slate-700` is dropped — per the spec mapping, border stays constant; the `has-[:checked]` provides the active visual cue.)

- [ ] **Step 6: Replace the radio input class**

Find:

```astro
<input
  type="radio"
  name="map-style"
  value={style.id}
  checked={style.id === defaultMapStyle}
  class="size-4 accent-emerald-500"
/>
```

Replace with:

```astro
<input
  type="radio"
  name="map-style"
  value={style.id}
  checked={style.id === defaultMapStyle}
  class="size-4 accent-[var(--color-accent)]"
/>
```

- [ ] **Step 7: Replace the radio label span**

Find:

```astro
<span class="text-slate-200">{style.label}</span>
```

Replace with:

```astro
<span class="text-fg-primary">{style.label}</span>
```

- [ ] **Step 8: Run dev and visually verify**

Run `npm run dev`. Open `/`. Click each tab in the sidebar (Adresse, Outils, Paramètres). Expected:

- The panel background is `#1A2230` (slightly lighter than the body).
- Panel titles render in `#E8ECF1`.
- Click "Paramètres". The map-style radio rows show a `#2A3548` border. Click on "Satellite" — its row gets a yellow border `#FFB627` and a darker bg `#2A3548`. The radio dot itself is yellow.

- [ ] **Step 9: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/components/PanelGroup.astro
git commit -m "refactor(panel-group): migrate to Midnight Tactical tokens

Section A→Settings now uses surface-card / line-default / accent
for active radios. The 'Styles de carte' legend gets the mono
HUD treatment per the spec."
```

---

### Task 19: Refactor `AddressSearch.astro`

**Files:**

- Modify: `src/components/AddressSearch.astro`

- [ ] **Step 1: Replace the `<label>` classes**

Find:

```astro
<label for="address-q" class="text-xs font-semibold tracking-wider text-slate-400 uppercase">
  Rechercher une adresse
</label>
```

Replace with:

```astro
<label for="address-q" class="font-mono text-xs font-semibold tracking-wider text-fg-secondary uppercase">
  Rechercher une adresse
</label>
```

- [ ] **Step 2: Replace the search icon class**

Find:

```astro
<Search
  size={16}
  aria-hidden="true"
  class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500"
/>
```

Replace with:

```astro
<Search
  size={16}
  aria-hidden="true"
  class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted"
/>
```

- [ ] **Step 3: Replace the input classes**

Find:

```astro
<input
  id="address-q"
  name="q"
  type="search"
  autocomplete="off"
  placeholder="Ville, rue, code postal…"
  class="w-full rounded-md border border-slate-800 bg-slate-950 py-2 pr-3 pl-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
/>
```

Replace with:

```astro
<input
  id="address-q"
  name="q"
  type="search"
  autocomplete="off"
  placeholder="Ville, rue, code postal…"
  class="w-full rounded-sm border border-line-default bg-surface-base py-2 pr-3 pl-9 text-sm text-fg-primary placeholder:text-fg-muted focus:border-accent focus:outline-none"
/>
```

- [ ] **Step 4: Replace the status `<p>` class**

Find:

```astro
<p
  id="address-status"
  aria-live="polite"
  aria-atomic="true"
  class="min-h-4 text-xs text-slate-500"
>
</p>
```

Replace with:

```astro
<p
  id="address-status"
  aria-live="polite"
  aria-atomic="true"
  class="min-h-4 text-xs text-fg-muted"
>
</p>
```

- [ ] **Step 5: Replace the `buttonClass` constant in the `<script>` block**

Find:

```ts
const buttonClass =
  'block w-full truncate rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500';
```

Replace with:

```ts
const buttonClass =
  'block w-full truncate rounded-sm border border-line-default bg-surface-base px-3 py-2 text-left text-sm text-fg-primary transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
```

(The hover-border-slate-700 is dropped per the spec — bordure constante.)

- [ ] **Step 6: Run dev and visually verify**

Run `npm run dev`. Open `/`. Click the "Adresse" tab if not already active. Expected:

- "RECHERCHER UNE ADRESSE" label in monospace uppercase, `#9AA5B4`.
- Input has `#1F2937`/`#2A3548` border and `#0F1419` background.
- Search icon is muted (`#6B7785`).
- Click into the input → border turns yellow `#FFB627`.
- Type "Paris" — after debounce, results appear as buttons. Hover one → bg goes `#2A3548`. Tab to a result → yellow focus ring.

- [ ] **Step 7: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/AddressSearch.astro
git commit -m "refactor(address-search): migrate to Midnight Tactical tokens

Input + label + result buttons + status all use the new palette.
Label gets the mono HUD treatment for sector/identifier labels."
```

---

### Task 20: Refactor `index.astro` (body classes + wrap map in corner brackets)

**Files:**

- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace the `<body>` classes**

Find:

```astro
<body class="flex h-dvh overflow-hidden bg-slate-950 text-slate-100">
```

Replace with:

```astro
<body class="flex h-dvh overflow-hidden bg-surface-base text-fg-primary">
```

- [ ] **Step 2: Wrap the `<main>` in `.c-corner-brackets` (with the two child spans)**

Find:

```astro
<main class="relative flex-1">
  <Map />
</main>
```

Replace with:

```astro
<main class="c-corner-brackets relative flex-1">
  <span class="c-corner-brackets-bl" aria-hidden="true"></span>
  <span class="c-corner-brackets-br" aria-hidden="true"></span>
  <Map />
</main>
```

The two spans are required for the bottom corners — see `corner-brackets.css` and the explanatory note from Task 10.

- [ ] **Step 3: Run dev and visually verify the full screen**

Run `npm run dev`. Open `/`. Expected:

- Body background is `#0F1419`.
- Sidebar (left, 64px) is the same dark with yellow O logo.
- Panel group is `#1A2230` with mono labels.
- Leaflet map fills the right area.
- **Yellow brackets at all 4 corners of the map area** — top-left, top-right, bottom-left, bottom-right. Brackets sit ~8px inside from the edges, 16px×16px, 2px thick, color `#FFB627`.

If brackets only show top corners, the bottom child spans are missing — verify the markup.

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro
git commit -m "refactor(index): migrate body classes + wrap map in corner brackets

Body now uses surface-base / fg-primary. The <main> containing
Leaflet gets .c-corner-brackets with the two required child spans
for bottom corners — gives the HUD-tactical frame around the map."
```

---

### Task 21: Verify no residual `slate-` / `emerald-` / `text-white` + clean build

**Files:** none (verification only)

- [ ] **Step 1: Grep for any remaining legacy palette classes in `src/`**

Run:

```bash
grep -rn "slate-\|emerald-\|text-white\|bg-white" src/components src/pages 2>/dev/null
```

Expected: no matches in source files. If any results appear (other than in comments documenting the migration, which there shouldn't be), refactor them following the spec mapping table.

- [ ] **Step 2: Verify `/styleguide` still renders correctly**

Run `npm run dev`. Open `/styleguide`. Scroll through all 8 sections (A–H). Each should render without console errors. Open devtools console — should be empty (no warnings, no errors).

- [ ] **Step 3: Verify the main `/` screen renders correctly**

Open `/`. Test:

- Click each sidebar tab — panel content swaps correctly.
- Click "Paramètres" → switch map style. The map tiles should update.
- Click "Adresse" → type "Paris" → results appear. Click one — the map flies to it.
- Press `Tab` from the URL bar → cycle through interactive elements. Yellow focus rings appear consistently.

- [ ] **Step 4: Run final build**

Run:

```bash
npm run build
```

Expected: build succeeds with no warnings.

- [ ] **Step 5: Commit (only if any cleanup was needed)**

If grep in step 1 found residuals and you fixed them, commit:

```bash
git add -A
git commit -m "chore(design): remove residual slate/emerald references

Cleanup pass after the main refactor — no more legacy palette
classes in src/components or src/pages."
```

If grep was clean, **skip this commit** — there's nothing to record.

---

## Phase 6 — Documentation

### Task 22: Write `DESIGN_SYSTEM.md` at the repo root

**Files:**

- Create: `DESIGN_SYSTEM.md`

- [ ] **Step 1: Create the file**

Create `DESIGN_SYSTEM.md` at the repo root with exactly this content:

````markdown
# Midnight Tactical — Design System

Application : ops-map (création de cartes pour parties d'airsoft).
Mode : dark uniquement. Ambiance : tactique moderne, hybride militaire / gaming.

> Référence visuelle vivante : démarrer `npm run dev` puis ouvrir
> [http://localhost:4321/styleguide](http://localhost:4321/styleguide).

## Palette

Les tokens sont déclarés dans `src/styles/tokens.css` via la directive Tailwind v4
`@theme`. Chaque token devient à la fois une variable CSS (`var(--color-X)`) et
une classe utilitaire Tailwind (`bg-X`, `text-X`, `border-X`).

### Surfaces & lignes

| Token                      | Hex       | Utilitaire            | Usage                                |
| -------------------------- | --------- | --------------------- | ------------------------------------ |
| `--color-surface-base`     | `#0F1419` | `bg-surface-base`     | Fond app                             |
| `--color-surface-card`     | `#1A2230` | `bg-surface-card`     | Panneaux, cartes, modales            |
| `--color-surface-elevated` | `#2A3548` | `bg-surface-elevated` | Hover, dropdowns, tooltips, selected |
| `--color-line-subtle`      | `#1F2937` | `border-line-subtle`  | Séparateurs discrets                 |
| `--color-line-default`     | `#2A3548` | `border-line-default` | Bordures cartes & inputs             |

### Texte

| Token                  | Hex       | Utilitaire          | Usage                          |
| ---------------------- | --------- | ------------------- | ------------------------------ |
| `--color-fg-primary`   | `#E8ECF1` | `text-fg-primary`   | Texte principal                |
| `--color-fg-secondary` | `#9AA5B4` | `text-fg-secondary` | Labels, texte secondaire       |
| `--color-fg-muted`     | `#6B7785` | `text-fg-muted`     | Hints, placeholders, tertiaire |

### Accent signature

| Token                  | Hex       | Utilitaire        | Usage                                                          |
| ---------------------- | --------- | ----------------- | -------------------------------------------------------------- |
| `--color-accent`       | `#FFB627` | `bg-accent`       | Boutons primaires, focus, indicateurs actifs, mise en évidence |
| `--color-accent-hover` | `#FFC547` | `bg-accent-hover` | Hover                                                          |
| `--color-accent-on`    | `#4A3300` | `text-accent-on`  | Texte sur fond accent                                          |

> **Règle d'usage** : l'accent jaune doit rester **rare et signifiant**. Il ne marque
> que ce qui est interactif ou actif. Jamais pour de simples décorations.

### Équipes / factions, markers, sémantique

Voir `tokens.css` pour la liste complète : `--color-team-{red|blue|green|purple}`,
`--color-marker-{objective|spawn|danger|cover}`, `--color-{success|warning|danger|info}`.

## Conventions de styling

### Utility-first par défaut

Le code consomme les tokens via les classes utilitaires Tailwind directement dans
les templates. Pas de fichier CSS dédié pour les composants standards (Button,
Card, Badge, Overlay vivent dans `src/components/ui/*.astro` avec leurs classes
inline).

### BEM (`c-*`) ciblé pour 3 composants à signature CSS forte

Les seuls fichiers CSS dédiés sont dans `src/styles/components/` :

- **`.c-corner-brackets`** — équerres jaunes aux 4 coins (HUD frame). Implémentation :
  pseudo-éléments pour les 2 coins du haut, spans enfants `.c-corner-brackets-bl`
  et `.c-corner-brackets-br` requis pour les 2 coins du bas. Variant `.is-active`
  pour intensifier (épaisseur ×1.5 + glow).

  ```html
  <div class="c-corner-brackets relative h-48">
    <span class="c-corner-brackets-bl" aria-hidden="true"></span>
    <span class="c-corner-brackets-br" aria-hidden="true"></span>
    <!-- contenu -->
  </div>
  ```

- **`.c-grid-overlay`** — grille tactique en `repeating-linear-gradient`.
  À placer en `position:absolute` dans un parent relatif. `pointer-events:none`.

- **`.c-pin`** — cercle plein 16×16, bordure 2px ivoire (`--color-team-stroke`).
  Modifiers : `.is-team-{red|blue|green|purple}`, `.is-{objective|spawn|danger|cover}`.
  Seul `.is-objective` ajoute un glow (`--shadow-glow-objective`).

### Pourquoi ce hybride

Tailwind utility-first reste l'idiome de la stack et accélère le développement.
Les 3 BEM existent uniquement parce qu'elles encapsulent des effets composés
(pseudo-éléments multiples, shadows superposées, modifiers sémantiques) que
décrire en utilitaires seulement deviendrait illisible à chaque appel.

## Composants

### `src/components/ui/Button.astro`

Props : `variant: 'primary' | 'secondary' | 'ghost'`, `size: 'sm' | 'md'`,
`href?` (rend en `<a>`), `disabled?`, `class?`, `aria-label?`.

### `src/components/ui/Card.astro`

Slots : `header` (optionnel), default, `footer` (optionnel). Pour encadrer
une Card en équerres HUD, appliquer la classe `.c-corner-brackets` sur le
parent et inclure les deux spans enfants requis (cf. section
`.c-corner-brackets` ci-dessus).

### `src/components/ui/Badge.astro`

Props : `variant: 'live' | 'team' | 'status'`, `team?`, `status?`. Voir le
catalogue `/styleguide` §E pour des exemples.

### `src/components/ui/Overlay.astro`

Bloc HUD monospace avec bordure latérale gauche jaune. Idéal pour timer,
coordonnées, identifiants de secteur sur la carte.

## Typographie

- **Sans (contenu)** : Inter Variable (self-hosted via `@fontsource-variable/inter`).
- **Mono (HUD)** : JetBrains Mono Variable (via `@fontsource-variable/jetbrains-mono`).

Utiliser `font-mono` pour : timers, coordonnées, identifiants de secteur, labels
uppercase de sections / panneaux. Tout le reste reste en sans.

## Effets

- `shadow-glow-accent` (utilitaire Tailwind) — `box-shadow: 0 0 20px rgba(255,182,39,0.25)`.
  Pour boutons critiques en focus / état actif.
- `shadow-glow-objective` — utilisé par `.c-pin.is-objective`.
- `--bracket-*` (CSS vars) — paramètres des équerres HUD, modifiables localement
  pour des contextes spécifiques.

## Accessibilité

- WCAG AA : tous les couples texte / fond ont un ratio ≥ 4.5:1 (vérifié).
- `prefers-reduced-motion: reduce` : transitions et animations réduites à
  ~0ms (réglé dans `primitives.css`).
- `:focus-visible` partout, jamais `:focus` seul. Outline 2px `--color-accent`.
- Les pins / badges teams ont toujours un label texte associé — la couleur
  n'est jamais l'unique vecteur d'information.

## Mapping pour migration depuis l'ancienne palette

| Ancien (slate / emerald)                | Nouveau (Midnight Tactical)    |
| --------------------------------------- | ------------------------------ |
| `bg-slate-950`                          | `bg-surface-base`              |
| `bg-slate-900`                          | `bg-surface-card`              |
| `bg-slate-800`                          | `bg-surface-elevated`          |
| `border-slate-800`                      | `border-line-default`          |
| `text-slate-100/200/300` / `text-white` | `text-fg-primary`              |
| `text-slate-400`                        | `text-fg-secondary`            |
| `text-slate-500`                        | `text-fg-muted`                |
| `text-emerald-400`                      | `text-accent`                  |
| `bg-emerald-500`                        | `bg-accent text-accent-on`     |
| `border-emerald-500`                    | `border-accent`                |
| `outline-emerald-500`                   | `outline-accent`               |
| `accent-emerald-500`                    | `accent-[var(--color-accent)]` |

## Note sur le brief original

Le brief utilisait la convention `--bg-base`, `--text-primary`, `--border-default`.
Pour bénéficier de la génération automatique d'utilitaires Tailwind v4 sans
classes redondantes (`bg-bg-base`), les tokens sont stockés sous la convention
`surface-` / `fg-` / `line-` (`--color-surface-base`, `--color-fg-primary`,
`--color-line-default`). La sémantique est identique.
````

- [ ] **Step 2: Verify the doc renders correctly**

Open `DESIGN_SYSTEM.md` in your editor (or render it on GitHub). Confirm tables and code blocks render correctly, no broken links.

- [ ] **Step 3: Commit**

```bash
git add DESIGN_SYSTEM.md
git commit -m "docs(design): add DESIGN_SYSTEM.md at repo root

Documents the Midnight Tactical palette, the utility-first +
targeted-BEM convention, the four UI components, accessibility
guarantees, and the migration mapping from the legacy slate/emerald
palette. Points to /styleguide as the live visual reference."
```

---

## Done — final check

After Task 22, run a final verification:

- [ ] **Final step 1:** `npm run build` succeeds without warnings.
- [ ] **Final step 2:** `npm run dev` → `/styleguide` renders all 8 sections cleanly with no console errors.
- [ ] **Final step 3:** `npm run dev` → `/` shows the refactored editor: dark blue-black body, yellow accents, monospace HUD labels, corner brackets framing the Leaflet map.
- [ ] **Final step 4:** `git log --oneline` shows ~22 atomic commits since the design spec, all on the `feature/init-project` branch (or wherever execution started).

Plan terminé.
