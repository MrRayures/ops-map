# Mise au propre de ops-map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor ops-map for readability and maintainability with zero behavior change — dedupe shared data, extract reusable UI components, factor the three editors, and split the monolithic `index.astro` script into focused `lib/` modules.

**Architecture:** Hybrid approach — reusable Astro components for structure plus `.c-` CSS components for style primitives. Work proceeds in 4 independent batches; after each, `npm run build` (which runs `astro check` type-checking) must pass and the app is manually verified. No `data-*` attribute consumed by existing JS is renamed, so behavior is preserved.

**Tech Stack:** Astro 6, Tailwind v4 (`@theme` tokens), TypeScript (strict), Leaflet, vanilla DOM scripts in `.astro` `<script>` blocks.

**Validation note:** This project has no test runner (`testing.md` → "to configure"). The validation gate for every task is: `npm run build` succeeds (includes type-check) + the manual check described in the task. There are no unit-test steps.

---

## File Structure

**Lot 1 — Shared data + button CSS**

- Create: `src/data/marker-colors.ts` — shared `MARKER_COLOR_CLASS` / `MARKER_COLOR_LABELS` maps.
- Create: `src/styles/components/button.css` — `.c-btn` + variants/sizes.
- Modify: `src/components/ui/Button.astro` — compose `.c-btn` classes instead of inline Tailwind.
- Modify: `src/styles/global.css` — import `button.css`.
- Modify: `src/components/MarkerEditor.astro`, `ZoneEditor.astro`, `TextEditor.astro` — import color maps instead of redeclaring.

**Lot 2 — Reusable form components**

- Create: `src/components/ui/FieldLabel.astro`, `TextField.astro`, `ColorSwatchGroup.astro`, `SegmentedControl.astro`.
- Create: `src/styles/components/form.css` — `.c-field-input`, `.c-field-label`, `.c-swatch`, `.c-segment`.
- Modify: `src/styles/global.css` — import `form.css`.
- Modify: the three editors + `PanelGroup.astro` to consume the new components.

**Lot 3 — Editor shell + binding helper**

- Create: `src/components/EditorShell.astro` — idle/header/form/delete scaffold via slots.
- Create: `src/lib/editor-binding.ts` — `commit`, `bindColorSwatches`, `bindTextField` helpers.
- Modify: the three editors to use `EditorShell` and the binding helpers.

**Lot 4 — Split `index.astro` script**

- Create: `src/lib/toast.ts`, `src/lib/app-bootstrap.ts`, `src/lib/selection-coordinator.ts`, `src/lib/settings-controls.ts`, `src/lib/zoom-controls.ts`, `src/lib/print-controls.ts`, `src/lib/persistence-controls.ts`.
- Modify: `src/pages/index.astro` — script reduced to imports + ordered `init()` calls.

---

## LOT 1 — Shared data + button CSS

### Task 1.1: Extract shared color maps to `data/marker-colors.ts`

**Files:**

- Create: `src/data/marker-colors.ts`
- Modify: `src/components/MarkerEditor.astro:20-40`
- Modify: `src/components/ZoneEditor.astro:6-26`
- Modify: `src/components/TextEditor.astro:6-26`

- [ ] **Step 1: Create the shared data module**

Create `src/data/marker-colors.ts`:

```ts
import type { MarkerColor } from './markers';

export const MARKER_COLOR_CLASS: Record<MarkerColor, string> = {
  'team-red': 'bg-team-red',
  'team-blue': 'bg-team-blue',
  'team-green': 'bg-team-green',
  'team-purple': 'bg-team-purple',
  'marker-objective': 'bg-marker-objective',
  'marker-spawn': 'bg-marker-spawn',
  'marker-danger': 'bg-marker-danger',
  'marker-cover': 'bg-marker-cover',
};

export const MARKER_COLOR_LABELS: Record<MarkerColor, string> = {
  'team-red': 'Équipe rouge',
  'team-blue': 'Équipe bleue',
  'team-green': 'Équipe verte',
  'team-purple': 'Équipe violette',
  'marker-objective': 'Objectif',
  'marker-spawn': 'Spawn',
  'marker-danger': 'Danger',
  'marker-cover': 'Couverture',
};
```

- [ ] **Step 2: Update `MarkerEditor.astro` to import the maps**

In `src/components/MarkerEditor.astro`, the frontmatter currently imports markers data and declares `colorClass` and `colorLabels`. Replace the two local declarations (the `const colorClass: Record<MarkerColor, string> = {...}` and `const colorLabels: Record<MarkerColor, string> = {...}` blocks, lines ~20-40) with an import. The final frontmatter import section should read:

```astro
---
import MapPinPlus from "@lucide/astro/icons/map-pin-plus";
import Button from "./ui/Button.astro";
import {
  MARKER_SHAPES,
  MARKER_COLORS,
  MARKER_ICONS,
  type MarkerShape,
} from "../data/markers";
import { MARKER_COLOR_CLASS, MARKER_COLOR_LABELS } from "../data/marker-colors";
import { buildIconSvg } from "../data/marker-icons";

const shapeLabels: Record<MarkerShape, string> = {
  square: "Carré",
  triangle: "Triangle",
  circle: "Cercle",
  diamond: "Losange",
};
---
```

Then in the template body, replace `colorClass[color]` with `MARKER_COLOR_CLASS[color]` and `colorLabels[color]` with `MARKER_COLOR_LABELS[color]` (in the COULEUR fieldset, lines ~98-102).

Note: the `MarkerColor` type import is no longer needed in frontmatter since the local maps are gone — remove `type MarkerColor` from the `../data/markers` import list (the `<script>` block keeps its own separate import of `MarkerColor` and is untouched).

- [ ] **Step 3: Update `ZoneEditor.astro` to import the maps**

In `src/components/ZoneEditor.astro`, replace the frontmatter (lines ~1-27) with:

```astro
---
import VectorSquare from "@lucide/astro/icons/vector-square";
import Button from "./ui/Button.astro";
import { MARKER_COLORS } from "../data/markers";
import { MARKER_COLOR_CLASS, MARKER_COLOR_LABELS } from "../data/marker-colors";
---
```

In the template, replace `colorClass[color]` → `MARKER_COLOR_CLASS[color]` and `colorLabels[color]` → `MARKER_COLOR_LABELS[color]` (COULEUR fieldset, lines ~66-70). Leave the `<script>` block untouched (it imports `MarkerColor` separately).

- [ ] **Step 4: Update `TextEditor.astro` to import the maps**

In `src/components/TextEditor.astro`, replace the frontmatter (lines ~1-27) with:

```astro
---
import Type from "@lucide/astro/icons/type";
import Button from "./ui/Button.astro";
import { MARKER_COLORS } from "../data/markers";
import { MARKER_COLOR_CLASS, MARKER_COLOR_LABELS } from "../data/marker-colors";
---
```

In the template, replace `colorClass[color]` → `MARKER_COLOR_CLASS[color]` and `colorLabels[color]` → `MARKER_COLOR_LABELS[color]` (COULEUR DE FOND fieldset, lines ~75-79). Leave the `<script>` block untouched.

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: build completes with no type errors. `astro check` reports 0 errors.

- [ ] **Step 6: Manual check**

Run: `npm run dev`, open the app. Open the Markers, Zones, and Texts panels and start placing each. Confirm the 8 color swatches render with correct colors and correct `aria-label` tooltips in all three editors. No visual change expected.

- [ ] **Step 7: Commit**

```bash
git add src/data/marker-colors.ts src/components/MarkerEditor.astro src/components/ZoneEditor.astro src/components/TextEditor.astro
git commit -m "refactor(editors): extract shared marker color maps to data/marker-colors"
```

---

### Task 1.2: Create `button.css` and refactor `Button.astro`

**Files:**

- Create: `src/styles/components/button.css`
- Modify: `src/styles/global.css:9` (add import)
- Modify: `src/components/ui/Button.astro:28-46`

- [ ] **Step 1: Create the button CSS component**

Create `src/styles/components/button.css`. These rules reproduce exactly the current Tailwind output (see `Button.astro` `base`/`variantClass`/`sizeClass`). Token names come from `tokens.css`.

```css
.c-btn {
  display: inline-flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
  transition:
    background-color 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.c-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.c-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Variants */
.c-btn--primary {
  background: var(--color-accent);
  color: var(--color-accent-on);
}
.c-btn--primary:hover {
  background: var(--color-accent-hover);
}

.c-btn--secondary {
  border: 1px solid var(--color-line-default);
  background: var(--color-surface-card);
  color: var(--color-fg-primary);
}
.c-btn--secondary:hover {
  background: var(--color-surface-elevated);
}

.c-btn--ghost {
  background: transparent;
  color: var(--color-fg-secondary);
}
.c-btn--ghost:hover {
  background: var(--color-surface-elevated);
  color: var(--color-fg-primary);
}

/* Sizes */
.c-btn--sm {
  height: 2rem;
  padding-inline: 0.75rem;
  font-size: 0.875rem;
}
.c-btn--md {
  height: 2.5rem;
  padding-inline: 1rem;
  font-size: 0.875rem;
}
```

- [ ] **Step 2: Import `button.css` in `global.css`**

In `src/styles/global.css`, add the import in the components group. After the line `@import './components/corner-brackets.css';` insert:

```css
@import './components/button.css';
```

- [ ] **Step 3: Refactor `Button.astro` to use `.c-btn`**

In `src/components/ui/Button.astro`, replace the frontmatter block from `const base =` through the `const classes =` assignment (lines ~28-46) with:

```astro
const variantClass: Record<Variant, string> = {
  primary: "c-btn--primary",
  secondary: "c-btn--secondary",
  ghost: "c-btn--ghost",
};

const sizeClass: Record<Size, string> = {
  sm: "c-btn--sm",
  md: "c-btn--md",
};

const classes = ["c-btn", variantClass[variant], sizeClass[size], extraClass]
  .filter(Boolean)
  .join(" ");
```

The `type Variant`, `type Size`, `interface Props`, the prop destructuring, and the `{ href ? ... : ... }` template below are unchanged.

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: build completes, 0 type errors.

- [ ] **Step 5: Manual check**

Run: `npm run dev`. Verify buttons look identical to before in: the bottom-right zoom controls (secondary + the inline `bg-black text-white` override classes still apply on top — confirm they remain black), each editor's "Ajouter…"/"Valider"/"Supprimer" buttons (primary/ghost), and the sidebar persistence buttons. Hover states and focus outlines must match. The `extraClass` overrides (e.g. `w-full`, `text-danger`, `bg-black`) must still take effect since they are appended after the `.c-btn--*` classes.

- [ ] **Step 6: Commit**

```bash
git add src/styles/components/button.css src/styles/global.css src/components/ui/Button.astro
git commit -m "refactor(ui): externalize button styles to button.css component"
```

---

## LOT 2 — Reusable form components

> All four components are presentational. They emit the same observable HTML
> (same `data-*`, same `role`, same `aria-*`) that the existing scripts query.
> Behavior is unchanged.

### Task 2.1: Create `form.css` style primitives

**Files:**

- Create: `src/styles/components/form.css`
- Modify: `src/styles/global.css` (add import)

- [ ] **Step 1: Create `form.css`**

Create `src/styles/components/form.css`. These reproduce the repeated Tailwind chains for inputs, field labels, color swatches, and segmented controls.

```css
/* Field label / legend — mono uppercase */
.c-field-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-fg-secondary);
}

/* Text input */
.c-field-input {
  width: 100%;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-line-default);
  background: var(--color-surface-base);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: var(--color-fg-primary);
}
.c-field-input::placeholder {
  color: var(--color-fg-muted);
}
.c-field-input:focus-visible {
  border-color: var(--color-accent);
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Color swatch (radio) */
.c-swatch {
  height: 2.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-line-default);
  transition: border-color 0.15s;
}
.c-swatch[aria-checked='true'] {
  border-color: var(--color-accent);
}
.c-swatch:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Segmented control item (button-based radio) */
.c-segment {
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-line-default);
  background: transparent;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: var(--color-fg-secondary);
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s,
    border-color 0.15s;
}
.c-segment:hover {
  background: var(--color-surface-elevated);
  color: var(--color-fg-primary);
}
.c-segment[aria-checked='true'] {
  border-color: var(--color-accent);
  background: var(--color-surface-elevated);
  color: var(--color-accent);
}
.c-segment:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Import `form.css` in `global.css`**

In `src/styles/global.css`, immediately after the `@import './components/button.css';` line (added in Lot 1), add:

```css
@import './components/form.css';
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: build completes, 0 errors. (No component uses these classes yet — this step only registers the CSS.)

- [ ] **Step 4: Commit**

```bash
git add src/styles/components/form.css src/styles/global.css
git commit -m "feat(styles): add form.css primitives (field, swatch, segment)"
```

---

### Task 2.2: Create `FieldLabel.astro`

**Files:**

- Create: `src/components/ui/FieldLabel.astro`

- [ ] **Step 1: Create the component**

Create `src/components/ui/FieldLabel.astro`:

```astro
---
type As = "label" | "legend" | "span";

interface Props {
  as?: As;
  for?: string;
  class?: string;
}

const { as = "span", for: htmlFor, class: extraClass } = Astro.props;
const classes = ["c-field-label", extraClass].filter(Boolean).join(" ");
const Tag = as;
---

{
  as === "label" ? (
    <label class={classes} for={htmlFor}>
      <slot />
    </label>
  ) : (
    <Tag class={classes}>
      <slot />
    </Tag>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: build completes, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/FieldLabel.astro
git commit -m "feat(ui): add FieldLabel component"
```

---

### Task 2.3: Create `TextField.astro`

**Files:**

- Create: `src/components/ui/TextField.astro`

- [ ] **Step 1: Create the component**

Create `src/components/ui/TextField.astro`. It renders the label (via `FieldLabel`) + a styled `<input>` carrying arbitrary `data-*` attributes passed through.

```astro
---
import FieldLabel from "./FieldLabel.astro";

interface Props {
  id: string;
  label: string;
  placeholder?: string;
  maxlength?: number;
  uppercase?: boolean;
  class?: string;
  [key: `data-${string}`]: string | number | boolean | undefined;
}

const {
  id,
  label,
  placeholder,
  maxlength,
  uppercase = false,
  class: extraClass,
  ...rest
} = Astro.props;

const inputClasses = ["c-field-input", uppercase ? "uppercase" : "", extraClass]
  .filter(Boolean)
  .join(" ");
---

<div class="flex flex-col gap-2">
  <FieldLabel as="label" for={id}>{label}</FieldLabel>
  <input
    id={id}
    type="text"
    class={inputClasses}
    placeholder={placeholder}
    maxlength={maxlength}
    {...rest}
  />
</div>
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: build completes, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/TextField.astro
git commit -m "feat(ui): add TextField component"
```

---

### Task 2.4: Create `ColorSwatchGroup.astro`

**Files:**

- Create: `src/components/ui/ColorSwatchGroup.astro`

- [ ] **Step 1: Create the component**

Create `src/components/ui/ColorSwatchGroup.astro`. It renders the `role="radiogroup"` grid of color swatches. The `field` prop names the `data-*` attribute the editor scripts query (each editor uses a different attribute name: `data-field`, `data-zone-field`, `data-text-field`).

```astro
---
import { MARKER_COLORS } from "../../data/markers";
import { MARKER_COLOR_CLASS, MARKER_COLOR_LABELS } from "../../data/marker-colors";

interface Props {
  /** The data attribute name used as the field key, e.g. "data-field" or "data-zone-field". */
  fieldAttr: string;
  /** The value of the field attribute, e.g. "color" or "background-color". */
  fieldValue: string;
  groupLabel: string;
}

const { fieldAttr, fieldValue, groupLabel } = Astro.props;
---

<div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label={groupLabel}>
  {
    MARKER_COLORS.map((color) => (
      <button
        type="button"
        role="radio"
        aria-checked="false"
        data-value={color}
        aria-label={MARKER_COLOR_LABELS[color]}
        class:list={["c-swatch", MARKER_COLOR_CLASS[color]]}
        {...{ [fieldAttr]: fieldValue }}
      />
    ))
  }
</div>
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: build completes, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ColorSwatchGroup.astro
git commit -m "feat(ui): add ColorSwatchGroup component"
```

---

### Task 2.5: Create `SegmentedControl.astro`

**Files:**

- Create: `src/components/ui/SegmentedControl.astro`

- [ ] **Step 1: Create the component**

Create `src/components/ui/SegmentedControl.astro`. It renders a `role="radiogroup"` of `<button role="radio">` items (the button-based variant used by MarkerEditor's content-kind toggle). The label-based segmented controls in PanelGroup (grid Oui/Non, print orientation) are intentionally left as-is in this plan because they wrap native radio `<input>`s with `name=` grouping — converting them is out of scope and risks changing form semantics.

```astro
---
interface Option {
  value: string;
  label: string;
}

interface Props {
  fieldAttr: string;
  fieldValue: string;
  groupLabel: string;
  options: Option[];
  columns?: number;
}

const { fieldAttr, fieldValue, groupLabel, options, columns = 2 } = Astro.props;
const gridClass = `grid grid-cols-${columns} gap-2`;
---

<div class={gridClass} role="radiogroup" aria-label={groupLabel}>
  {
    options.map((opt) => (
      <button
        type="button"
        role="radio"
        aria-checked="false"
        data-value={opt.value}
        class="c-segment"
        {...{ [fieldAttr]: fieldValue }}
      >
        {opt.label}
      </button>
    ))
  }
</div>
```

Note on Tailwind dynamic class: `grid-cols-${columns}` must exist in the compiled CSS. Since the only callers use `columns={2}` (content-kind), and `grid-cols-2` is already used elsewhere in the project (PanelGroup), it is safelisted by usage. Do not pass arbitrary column counts that aren't already present in the codebase.

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: build completes, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/SegmentedControl.astro
git commit -m "feat(ui): add SegmentedControl component"
```

---

### Task 2.6: Adopt form components in the three editors

**Files:**

- Modify: `src/components/MarkerEditor.astro` (template: color fieldset, content-kind, content-text input, label input)
- Modify: `src/components/ZoneEditor.astro` (template: color fieldset, label input)
- Modify: `src/components/TextEditor.astro` (template: value input, color fieldset)

> The editors' `<script>` blocks are NOT modified in this task. The new
> components emit the same `data-*` attributes the scripts query, so the
> selectors keep matching.

- [ ] **Step 1: Update `MarkerEditor.astro` template**

Add imports to the frontmatter (after the existing imports):

```astro
import FieldLabel from "./ui/FieldLabel.astro";
import TextField from "./ui/TextField.astro";
import ColorSwatchGroup from "./ui/ColorSwatchGroup.astro";
import SegmentedControl from "./ui/SegmentedControl.astro";
```

Replace the **Forme** fieldset's `<legend>` with `<FieldLabel as="legend">Forme</FieldLabel>` (keep the shape buttons as-is — shapes use `.c-marker` preview markup, not a swatch).

Replace the **Couleur** fieldset's inner `<div role="radiogroup">…</div>` block (the `MARKER_COLORS.map(...)` swatch grid) with:

```astro
<ColorSwatchGroup fieldAttr="data-field" fieldValue="color" groupLabel="Couleur du marqueur" />
```

and its `<legend>` with `<FieldLabel as="legend">Couleur</FieldLabel>`.

Replace the **Contenu** fieldset's content-kind `<div role="radiogroup">…</div>` (the `["text","icon"].map(...)` block) with:

```astro
<SegmentedControl
  fieldAttr="data-field"
  fieldValue="content-kind"
  groupLabel="Type de contenu"
  options={[
    { value: "text", label: "Texte" },
    { value: "icon", label: "Icône" },
  ]}
/>
```

and its `<legend>` with `<FieldLabel as="legend">Contenu</FieldLabel>`.

Replace the content-text `<input data-field="content-text" …>` (inside `<div data-content-text>`) with the `c-field-input` class while keeping the wrapper and its `data-content-text`/`hidden`:

```astro
<div data-content-text class="flex flex-col gap-2" hidden>
  <input
    type="text"
    data-field="content-text"
    maxlength="3"
    class="c-field-input uppercase"
    placeholder="LZ"
    aria-label="Contenu texte (1 à 3 caractères)"
  />
</div>
```

Leave the icon grid (`data-content-icon`) as-is (icons use `buildIconSvg`, not a swatch/segment).

Replace the **Label** block (the `<label for="marker-label">…</label>` + `<input id="marker-label" …>`) with:

```astro
<TextField
  id="marker-label"
  label="Label (optionnel)"
  placeholder="MIKE 4"
  maxlength={40}
  data-field="label"
/>
```

- [ ] **Step 2: Verify build + manual check for MarkerEditor**

Run: `npm run build` → 0 errors.
Run: `npm run dev`. Open Markers, place a marker. Verify: shape selection, color selection (swatches highlight on select), content-kind toggle (Texte/Icône switch sub-controls), content-text input, label input, and the validated marker on the map — all behave exactly as before.

- [ ] **Step 3: Commit MarkerEditor**

```bash
git add src/components/MarkerEditor.astro
git commit -m "refactor(MarkerEditor): adopt FieldLabel/TextField/ColorSwatchGroup/SegmentedControl"
```

- [ ] **Step 4: Update `ZoneEditor.astro` template**

Add imports to frontmatter:

```astro
import FieldLabel from "./ui/FieldLabel.astro";
import TextField from "./ui/TextField.astro";
import ColorSwatchGroup from "./ui/ColorSwatchGroup.astro";
```

Replace the **Couleur** fieldset's `<legend>` with `<FieldLabel as="legend">Couleur</FieldLabel>` and its swatch `<div role="radiogroup">…</div>` with:

```astro
<ColorSwatchGroup fieldAttr="data-zone-field" fieldValue="color" groupLabel="Couleur de la zone" />
```

Replace the **Label** block (`<label for="zone-label">` + `<input id="zone-label" …>`) with:

```astro
<TextField
  id="zone-label"
  label="Label (optionnel)"
  placeholder="ALPHA"
  maxlength={40}
  data-zone-field="label"
/>
```

Leave the "Zone de jeu" checkbox `<label>` block untouched.

- [ ] **Step 5: Verify build + manual check for ZoneEditor**

Run: `npm run build` → 0 errors.
Run: `npm run dev`. Open Zones, place a polygon (≥3 vertices), validate. Verify color swatches, label input, play-area checkbox, and the placing/edit hints all behave as before.

- [ ] **Step 6: Commit ZoneEditor**

```bash
git add src/components/ZoneEditor.astro
git commit -m "refactor(ZoneEditor): adopt FieldLabel/TextField/ColorSwatchGroup"
```

- [ ] **Step 7: Update `TextEditor.astro` template**

Add imports to frontmatter:

```astro
import FieldLabel from "./ui/FieldLabel.astro";
import TextField from "./ui/TextField.astro";
import ColorSwatchGroup from "./ui/ColorSwatchGroup.astro";
```

Replace the **Texte** block (`<label for="text-value">` + `<input id="text-value" …>`) with:

```astro
<TextField
  id="text-value"
  label="Texte"
  placeholder="ZONE BLEUE"
  maxlength={60}
  data-text-field="value"
/>
```

Replace the **Couleur de fond** fieldset's `<legend>` with `<FieldLabel as="legend">Couleur de fond</FieldLabel>` and its swatch grid with:

```astro
<ColorSwatchGroup fieldAttr="data-text-field" fieldValue="background-color" groupLabel="Couleur de fond" />
```

- [ ] **Step 8: Verify build + manual check for TextEditor**

Run: `npm run build` → 0 errors.
Run: `npm run dev`. Open Texts, place a text, validate. Verify the value input and background-color swatches behave as before.

- [ ] **Step 9: Commit TextEditor**

```bash
git add src/components/TextEditor.astro
git commit -m "refactor(TextEditor): adopt FieldLabel/TextField/ColorSwatchGroup"
```

---

## LOT 3 — Editor shell + binding helper

### Task 3.1: Create `lib/editor-binding.ts`

**Files:**

- Create: `src/lib/editor-binding.ts`

This module factors the repeated `if (selectedId) updateSelected(x) else updateDraft(x)` logic and the swatch/text-field wiring. Stores expose module-level functions, so the helper takes a small "store interface" object built from the store's imports.

- [ ] **Step 1: Create the module**

Create `src/lib/editor-binding.ts`:

```ts
/**
 * Minimal store surface the editor bindings need. Each editor passes an
 * object built from its store's named exports (markers-store, zones-store,
 * texts-store all expose these with compatible shapes).
 */
export interface EditorStore<Patch> {
  getState(): { selectedId: string | null };
  updateSelected(patch: Patch): void;
  updateDraft(patch: Patch): void;
}

/** Apply a patch to the selected item, or to the draft when nothing is selected. */
export function commit<Patch>(store: EditorStore<Patch>, patch: Patch): void {
  if (store.getState().selectedId !== null) store.updateSelected(patch);
  else store.updateDraft(patch);
}

/**
 * Wire a group of color-swatch radios. On click, commits { [key]: value } to
 * the store. `value` comes from each button's data-value attribute.
 */
export function bindColorSwatches<Patch>(
  buttons: Iterable<HTMLButtonElement>,
  store: EditorStore<Patch>,
  key: keyof Patch & string,
): void {
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value as Patch[keyof Patch];
      commit(store, { [key]: value } as Patch);
    });
  }
}

/** Wire a text input. On input, commits { [key]: input.value } to the store. */
export function bindTextField<Patch>(
  input: HTMLInputElement,
  store: EditorStore<Patch>,
  key: keyof Patch & string,
): void {
  input.addEventListener('input', () => {
    commit(store, { [key]: input.value } as Patch);
  });
}

/** Reflect the active color onto swatch buttons via aria-checked. */
export function reflectChecked(buttons: Iterable<HTMLButtonElement>, activeValue: string): void {
  for (const btn of buttons) {
    btn.setAttribute('aria-checked', String(btn.dataset.value === activeValue));
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: 0 errors. (Not yet imported — this only type-checks the module.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/editor-binding.ts
git commit -m "feat(lib): add editor-binding helpers (commit/bindColorSwatches/bindTextField/reflectChecked)"
```

---

### Task 3.2: Create `EditorShell.astro`

**Files:**

- Create: `src/components/EditorShell.astro`

The shell centralizes: the idle "add" button, the form header (status + close button), and the delete wrapper. Each editor supplies its own `data-*` attribute prefix so existing scripts keep matching. Named slots: `idle-icon`, `form`, `delete`.

- [ ] **Step 1: Create the component**

Create `src/components/EditorShell.astro`:

```astro
---
import Button from "./ui/Button.astro";

interface Props {
  /** Root data attribute, e.g. "data-marker-editor". */
  rootAttr: string;
  /** Idle wrapper data attribute, e.g. "data-marker-editor-idle". */
  idleAttr: string;
  /** Form wrapper data attribute, e.g. "data-marker-editor-form". */
  formAttr: string;
  /** Status span data attribute, e.g. "data-form-status". */
  statusAttr: string;
  /** Delete wrapper data attribute, e.g. "data-delete-wrap". */
  deleteAttr: string;
  /** Idle button label, e.g. "Ajouter un marqueur". */
  idleLabel: string;
  /** data-action of the idle/start button, e.g. "start-placing". */
  startAction: string;
  /** data-action of the close button, e.g. "cancel-or-deselect". */
  closeAction: string;
}

const {
  rootAttr,
  idleAttr,
  formAttr,
  statusAttr,
  deleteAttr,
  idleLabel,
  startAction,
  closeAction,
} = Astro.props;
---

<div {...{ [rootAttr]: "" }}>
  <div {...{ [idleAttr]: "" }}>
    <Button variant="primary" size="md" class="w-full" data-action={startAction}>
      {idleLabel}
      <slot name="idle-icon" />
    </Button>
  </div>

  <div {...{ [formAttr]: "" }} hidden class="flex flex-col gap-5">
    <div class="flex items-center justify-between">
      <span
        {...{ [statusAttr]: "" }}
        aria-live="polite"
        class="font-mono text-xs tracking-wider text-fg-secondary uppercase"
      ></span>
      <Button variant="ghost" size="sm" data-action={closeAction} aria-label="Fermer">
        ✕
      </Button>
    </div>

    <slot name="form" />

    <div {...{ [deleteAttr]: "" }} hidden class="border-t border-line-subtle pt-4">
      <slot name="delete" />
    </div>
  </div>
</div>
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/EditorShell.astro
git commit -m "feat(components): add EditorShell scaffold (idle/header/form/delete slots)"
```

---

### Task 3.3: Refactor `TextEditor.astro` onto the shell + helpers

> TextEditor is the simplest of the three — do it first to validate the
> shell/helpers before the larger MarkerEditor.

**Files:**

- Modify: `src/components/TextEditor.astro` (template + script)

- [ ] **Step 1: Rewrite the template using `EditorShell`**

Replace the entire template (the `<div data-text-editor>…</div>` block) with:

```astro
<EditorShell
  rootAttr="data-text-editor"
  idleAttr="data-text-editor-idle"
  formAttr="data-text-editor-form"
  statusAttr="data-text-form-status"
  deleteAttr="data-text-delete-wrap"
  idleLabel="Ajouter un texte"
  startAction="text-start-placing"
  closeAction="text-cancel-or-deselect"
>
  <Type slot="idle-icon" size={20} aria-hidden="true" />

  <Fragment slot="form">
    <TextField
      id="text-value"
      label="Texte"
      placeholder="ZONE BLEUE"
      maxlength={60}
      data-text-field="value"
    />

    <fieldset class="flex flex-col gap-2">
      <FieldLabel as="legend">Couleur de fond</FieldLabel>
      <ColorSwatchGroup fieldAttr="data-text-field" fieldValue="background-color" groupLabel="Couleur de fond" />
    </fieldset>
  </Fragment>

  <Button slot="delete" variant="ghost" size="sm" class="w-full text-danger hover:bg-surface-elevated" data-action="text-delete">
    Supprimer ce texte
  </Button>
</EditorShell>
```

Update the frontmatter imports to include the shell (the others from Lot 2 already present):

```astro
import EditorShell from "./EditorShell.astro";
import Button from "./ui/Button.astro";
import FieldLabel from "./ui/FieldLabel.astro";
import TextField from "./ui/TextField.astro";
import ColorSwatchGroup from "./ui/ColorSwatchGroup.astro";
import Type from "@lucide/astro/icons/type";
import { MARKER_COLORS } from "../data/markers";
```

Note: `MARKER_COLOR_CLASS`/`MARKER_COLOR_LABELS` are now used inside `ColorSwatchGroup`, so TextEditor no longer imports them. `MARKER_COLORS` is no longer referenced in the template either — remove it if `astro check` flags it as unused; keep the import list minimal.

- [ ] **Step 2: Simplify the script using the binding helpers**

In the `<script>` block, replace the `for (const btn of colorBtns) {...}` click loop and the `valueInput.addEventListener("input", ...)` block with helper calls, and the render-loop's `aria-checked` swatch loop with `reflectChecked`. Add the import and a `store` adapter. The full script becomes:

```ts
import type { MarkerColor } from '../data/markers';
import {
  deleteSelected,
  getState,
  selectText,
  setMode,
  subscribe,
  updateDraft,
  updateSelected,
} from '../lib/texts-store';
import { bindColorSwatches, bindTextField, reflectChecked } from '../lib/editor-binding';

const root = document.querySelector<HTMLElement>('[data-text-editor]');
if (root) {
  const idle = root.querySelector<HTMLElement>('[data-text-editor-idle]')!;
  const form = root.querySelector<HTMLElement>('[data-text-editor-form]')!;
  const statusEl = root.querySelector<HTMLElement>('[data-text-form-status]')!;
  const startBtn = root.querySelector<HTMLButtonElement>(
    'button[data-action="text-start-placing"]',
  )!;
  const cancelBtn = root.querySelector<HTMLButtonElement>(
    'button[data-action="text-cancel-or-deselect"]',
  )!;
  const valueInput = root.querySelector<HTMLInputElement>('input[data-text-field="value"]')!;
  const colorBtns = root.querySelectorAll<HTMLButtonElement>(
    'button[data-text-field="background-color"]',
  );
  const deleteWrap = root.querySelector<HTMLElement>('[data-text-delete-wrap]')!;
  const deleteBtn = root.querySelector<HTMLButtonElement>('button[data-action="text-delete"]')!;

  const store = { getState, updateSelected, updateDraft };

  startBtn.addEventListener('click', () => setMode('placing'));

  cancelBtn.addEventListener('click', () => {
    const { mode } = getState();
    if (mode === 'placing') setMode('idle');
    else selectText(null);
  });

  bindColorSwatches<{ backgroundColor: MarkerColor }>(colorBtns, store, 'backgroundColor');
  bindTextField<{ value: string }>(valueInput, store, 'value');

  deleteBtn.addEventListener('click', () => {
    deleteSelected();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    const { mode, selectedId } = getState();
    if (mode === 'placing') setMode('idle');
    else if (selectedId) selectText(null);
  });

  function render(): void {
    const state = getState();
    const showIdle = state.mode === 'idle' && state.selectedId === null;
    idle.hidden = !showIdle;
    form.hidden = showIdle;
    deleteWrap.hidden = !state.selectedId;

    if (showIdle) return;

    const source = state.selectedId ? state.texts.find((t) => t.id === state.selectedId) : null;
    const data = source ?? state.draft;

    statusEl.textContent =
      state.mode === 'placing' ? 'Cliquez pour placer le texte' : 'Texte sélectionné';

    cancelBtn.setAttribute(
      'aria-label',
      state.mode === 'placing' ? 'Annuler le placement' : 'Désélectionner',
    );

    reflectChecked(colorBtns, data.backgroundColor);

    if (valueInput.value !== data.value) {
      valueInput.value = data.value;
    }
  }

  render();
  subscribe(render);
}
```

- [ ] **Step 3: Verify build + manual check**

Run: `npm run build` → 0 errors.
Run: `npm run dev`. Open Texts: place a text, type a value, change background color, select an existing text (panel reflects its value/color), delete it, press Escape to deselect. All must behave exactly as before.

- [ ] **Step 4: Commit**

```bash
git add src/components/TextEditor.astro
git commit -m "refactor(TextEditor): build on EditorShell + editor-binding helpers"
```

---

### Task 3.4: Refactor `ZoneEditor.astro` onto the shell + helpers

**Files:**

- Modify: `src/components/ZoneEditor.astro` (template + script)

> Zone has extra bits the shell doesn't own: two hint paragraphs
> (`data-zone-placing-hint`, `data-zone-edit-hint`) and the play-area checkbox.
> These live inside the `form` slot.

- [ ] **Step 1: Rewrite the template using `EditorShell`**

Replace the entire `<div data-zone-editor>…</div>` block with:

```astro
<EditorShell
  rootAttr="data-zone-editor"
  idleAttr="data-zone-editor-idle"
  formAttr="data-zone-editor-form"
  statusAttr="data-zone-form-status"
  deleteAttr="data-zone-delete-wrap"
  idleLabel="Ajouter une zone"
  startAction="zone-start-placing"
  closeAction="zone-cancel-or-deselect"
>
  <VectorSquare slot="idle-icon" size={20} aria-hidden="true" />

  <Fragment slot="form">
    <p data-zone-placing-hint hidden class="text-xs text-fg-secondary">
      Clic = ajouter un sommet · Double-clic ou Entrée = valider · Échap = annuler
    </p>
    <p data-zone-edit-hint hidden class="text-xs text-fg-secondary">
      Glisser un sommet pour le déplacer · Clic sur un point intermédiaire pour ajouter un sommet · Clic droit sur un sommet pour le supprimer
    </p>

    <fieldset class="flex flex-col gap-2">
      <FieldLabel as="legend">Couleur</FieldLabel>
      <ColorSwatchGroup fieldAttr="data-zone-field" fieldValue="color" groupLabel="Couleur de la zone" />
    </fieldset>

    <TextField
      id="zone-label"
      label="Label (optionnel)"
      placeholder="ALPHA"
      maxlength={40}
      data-zone-field="label"
    />

    <label class="flex cursor-pointer items-start gap-3 rounded-sm border border-line-default px-3 py-2 has-[:checked]:border-accent has-[:checked]:bg-surface-elevated has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
      <input
        type="checkbox"
        data-zone-field="play-area"
        class="mt-0.5 size-4 accent-[var(--color-accent)]"
      />
      <span class="flex flex-col gap-1">
        <span class="text-sm text-fg-primary">Zone de jeu</span>
        <span class="text-xs text-fg-secondary">Délimite le terrain jouable. Une seule zone de jeu par opération.</span>
      </span>
    </label>

    <Button variant="primary" size="md" class="w-full" data-action="zone-finish">
      Valider
    </Button>
  </Fragment>

  <Button slot="delete" variant="ghost" size="sm" class="w-full text-danger hover:bg-surface-elevated" data-action="zone-delete">
    Supprimer cette zone
  </Button>
</EditorShell>
```

> Note: the original had "Valider" inside the form but the shell does not own a
> Valider button (only Marker/Zone have one; Text does not). So Valider stays in
> the `form` slot, as shown.

Frontmatter imports:

```astro
import EditorShell from "./EditorShell.astro";
import Button from "./ui/Button.astro";
import FieldLabel from "./ui/FieldLabel.astro";
import TextField from "./ui/TextField.astro";
import ColorSwatchGroup from "./ui/ColorSwatchGroup.astro";
import VectorSquare from "@lucide/astro/icons/vector-square";
```

(`MARKER_COLORS` / color maps no longer needed in this file — removed.)

- [ ] **Step 2: Simplify the script using the binding helpers**

In the `<script>` block, add the helper import and `store` adapter, then replace the color loop and label-input listener. Keep all zone-specific logic (finishDraft, play-area, hints, finishBtn disabled state) unchanged. The updated portions:

Add to imports:

```ts
import { bindColorSwatches, bindTextField, reflectChecked } from '../lib/editor-binding';
```

After the element queries, add:

```ts
const store = { getState, updateSelected, updateDraft };
```

Replace the `for (const btn of colorBtns) {...}` click loop with:

```ts
bindColorSwatches<{ color: MarkerColor }>(colorBtns, store, 'color');
```

Replace the `labelInput.addEventListener("input", ...)` block with:

```ts
bindTextField<{ label: string }>(labelInput, store, 'label');
```

In `render()`, replace the `for (const btn of colorBtns) { btn.setAttribute("aria-checked", ...) }` loop with:

```ts
reflectChecked(colorBtns, data.color);
```

Everything else in the script (closeEditor, cancelBtn/finishBtn handlers, playAreaCheckbox listener, deleteBtn, hint toggling, finishBtn.disabled) stays exactly as it is.

- [ ] **Step 3: Verify build + manual check**

Run: `npm run build` → 0 errors.
Run: `npm run dev`. Open Zones: place a polygon (place 1-2 vertices → Valider disabled; ≥3 → enabled), validate via button and via double-click, select an existing zone (edit hint shows, drag a vertex), toggle play-area, change color/label, delete, Escape. All behave as before.

- [ ] **Step 4: Commit**

```bash
git add src/components/ZoneEditor.astro
git commit -m "refactor(ZoneEditor): build on EditorShell + editor-binding helpers"
```

---

### Task 3.5: Refactor `MarkerEditor.astro` onto the shell + helpers

**Files:**

- Modify: `src/components/MarkerEditor.astro` (template + script)

> Marker is the richest editor: shape radios (custom `.c-marker` preview),
> content-kind toggle, content-text input, content-icon grid. Only the
> color swatches and label input map cleanly onto the helpers; shape/content
> logic stays bespoke.

- [ ] **Step 1: Rewrite the template using `EditorShell`**

Replace the entire `<div data-marker-editor>…</div>` block with the shell. The shape fieldset, content fieldset (kind toggle + text input + icon grid), color fieldset, and label go into the `form` slot:

```astro
<EditorShell
  rootAttr="data-marker-editor"
  idleAttr="data-marker-editor-idle"
  formAttr="data-marker-editor-form"
  statusAttr="data-form-status"
  deleteAttr="data-delete-wrap"
  idleLabel="Ajouter un marqueur"
  startAction="start-placing"
  closeAction="cancel-or-deselect"
>
  <MapPinPlus slot="idle-icon" size={24} aria-hidden="true" />

  <Fragment slot="form">
    <fieldset class="flex flex-col gap-2">
      <FieldLabel as="legend">Forme</FieldLabel>
      <div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Forme du marqueur">
        {
          MARKER_SHAPES.map((shape) => (
            <button
              type="button"
              role="radio"
              aria-checked="false"
              data-field="shape"
              data-value={shape}
              aria-label={shapeLabels[shape]}
              class="grid h-10 place-items-center rounded-sm border border-line-default bg-transparent text-fg-secondary transition-colors hover:bg-surface-elevated hover:text-fg-primary aria-checked:border-accent aria-checked:bg-surface-elevated aria-checked:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span class:list={["c-marker", `is-shape-${shape}`, "is-color-team-blue"]} aria-hidden="true">
                <span class="c-marker-body" />
              </span>
            </button>
          ))
        }
      </div>
    </fieldset>

    <fieldset class="flex flex-col gap-2">
      <FieldLabel as="legend">Couleur</FieldLabel>
      <ColorSwatchGroup fieldAttr="data-field" fieldValue="color" groupLabel="Couleur du marqueur" />
    </fieldset>

    <fieldset class="flex flex-col gap-2">
      <FieldLabel as="legend">Contenu</FieldLabel>
      <SegmentedControl
        fieldAttr="data-field"
        fieldValue="content-kind"
        groupLabel="Type de contenu"
        options={[
          { value: "text", label: "Texte" },
          { value: "icon", label: "Icône" },
        ]}
      />

      <div data-content-text class="flex flex-col gap-2" hidden>
        <input
          type="text"
          data-field="content-text"
          maxlength="3"
          class="c-field-input uppercase"
          placeholder="LZ"
          aria-label="Contenu texte (1 à 3 caractères)"
        />
      </div>

      <div data-content-icon class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Choix d'icône" hidden>
        {
          MARKER_ICONS.map((icon) => (
            <button
              type="button"
              role="radio"
              aria-checked="false"
              data-field="content-icon"
              data-value={icon}
              aria-label={icon}
              class="grid h-10 place-items-center rounded-sm border border-line-default bg-transparent text-fg-secondary transition-colors hover:bg-surface-elevated hover:text-fg-primary aria-checked:border-accent aria-checked:bg-surface-elevated aria-checked:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              set:html={buildIconSvg(icon, "size-5")}
            />
          ))
        }
      </div>
    </fieldset>

    <TextField
      id="marker-label"
      label="Label (optionnel)"
      placeholder="MIKE 4"
      maxlength={40}
      data-field="label"
    />

    <Button variant="primary" size="md" class="w-full" data-action="finish">
      Valider
    </Button>
  </Fragment>

  <Button slot="delete" variant="ghost" size="sm" class="w-full text-danger hover:bg-surface-elevated" data-action="delete">
    Supprimer ce marqueur
  </Button>
</EditorShell>
```

Frontmatter imports:

```astro
import EditorShell from "./EditorShell.astro";
import Button from "./ui/Button.astro";
import FieldLabel from "./ui/FieldLabel.astro";
import TextField from "./ui/TextField.astro";
import ColorSwatchGroup from "./ui/ColorSwatchGroup.astro";
import SegmentedControl from "./ui/SegmentedControl.astro";
import MapPinPlus from "@lucide/astro/icons/map-pin-plus";
import {
  MARKER_SHAPES,
  MARKER_ICONS,
  type MarkerShape,
} from "../data/markers";
import { buildIconSvg } from "../data/marker-icons";

const shapeLabels: Record<MarkerShape, string> = {
  square: "Carré",
  triangle: "Triangle",
  circle: "Cercle",
  diamond: "Losange",
};
```

(`MARKER_COLORS` and the color maps are no longer referenced here — `ColorSwatchGroup` owns them.)

- [ ] **Step 2: Simplify the script's color + label wiring**

In the `<script>` block, add the helper import and `store` adapter, and replace the color-swatch click loop, the label-input listener, and the color `aria-checked` loop in `render()`. Leave shape, content-kind, content-text, content-icon logic untouched.

Add to imports:

```ts
import { bindColorSwatches, bindTextField, reflectChecked } from '../lib/editor-binding';
```

After the element queries, add:

```ts
const store = { getState, updateSelected, updateDraft };
```

Replace the `for (const btn of colorBtns) {...}` click loop with:

```ts
bindColorSwatches<{ color: MarkerColor }>(colorBtns, store, 'color');
```

Replace the `labelInput.addEventListener("input", ...)` block with:

```ts
bindTextField<{ label: string }>(labelInput, store, 'label');
```

In `render()`, replace the `for (const btn of colorBtns) { btn.setAttribute("aria-checked", ...) }` loop with:

```ts
reflectChecked(colorBtns, data.color);
```

All other script logic (shapeBtns loop, contentKindBtns loop, contentTextInput listener, contentIconBtns loop, closeEditor, render's shape/content reflection, Escape handler) stays exactly as it is.

- [ ] **Step 3: Verify build + manual check**

Run: `npm run build` → 0 errors.
Run: `npm run dev`. Open Markers and exercise the full editor: shape selection, color swatches, content-kind toggle (Texte shows text input, Icône shows icon grid), content-text typing (≤3 chars uppercase), icon selection, label, Valider, select existing marker (panel reflects all fields), delete, Escape. Behavior identical to before.

- [ ] **Step 4: Commit**

```bash
git add src/components/MarkerEditor.astro
git commit -m "refactor(MarkerEditor): build on EditorShell + editor-binding helpers"
```

---

## LOT 4 — Split `index.astro` script

> Each module exports an `init(...)` that takes its dependencies as arguments
> (no globals). `index.astro`'s script becomes a short orchestration that wires
> them in order. All modules live in `src/lib/`. The `window.__opsMapBoot`
> global and `ops-map:boot` event remain (consumed by Map.astro).

### Task 4.1: Extract `lib/toast.ts`

**Files:**

- Create: `src/lib/toast.ts`

- [ ] **Step 1: Create the module**

Create `src/lib/toast.ts`:

```ts
/** Creates a toast helper bound to the #toast element. Returns a showToast fn. */
export function createToast(): (message: string) => void {
  let toastTimer: number | null = null;
  return (message: string): void => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    if (toastTimer !== null) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      el.hidden = true;
      toastTimer = null;
    }, 2000);
  };
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/toast.ts
git commit -m "feat(lib): extract toast helper from index"
```

---

### Task 4.2: Extract `lib/selection-coordinator.ts`

**Files:**

- Create: `src/lib/selection-coordinator.ts`

This owns the mutual-exclusion of selection/placing across the three stores and opening the edit panel (index.astro lines ~209-293).

- [ ] **Step 1: Create the module**

Create `src/lib/selection-coordinator.ts`:

```ts
import {
  getState as getMarkersState,
  selectMarker,
  setMode as setMarkersMode,
  subscribe as subscribeMarkers,
} from './markers-store';
import {
  getState as getZonesState,
  selectZone,
  setMode as setZonesMode,
  subscribe as subscribeZones,
} from './zones-store';
import {
  getState as getTextsState,
  selectText,
  setMode as setTextsMode,
  subscribe as subscribeTexts,
} from './texts-store';

type Active = 'markers' | 'zones' | 'texts';

const panelForStore: Record<Active, string> = {
  markers: 'panel-markers',
  zones: 'panel-zones',
  texts: 'panel-texts',
};

function openEditPanel(active: Active): void {
  document.dispatchEvent(
    new CustomEvent('ops-map:open-panel', {
      detail: { panel: panelForStore[active] },
    }),
  );
}

function clearOthersForSelect(active: Active): void {
  if (active !== 'markers' && getMarkersState().selectedId !== null) selectMarker(null);
  if (active !== 'zones' && getZonesState().selectedId !== null) selectZone(null);
  if (active !== 'texts' && getTextsState().selectedId !== null) selectText(null);
}

function clearOthersForPlacing(active: Active): void {
  if (active !== 'markers') {
    if (getMarkersState().mode === 'placing') setMarkersMode('idle');
    if (getMarkersState().selectedId !== null) selectMarker(null);
  }
  if (active !== 'zones') {
    if (getZonesState().mode === 'placing') setZonesMode('idle');
    if (getZonesState().selectedId !== null) selectZone(null);
  }
  if (active !== 'texts') {
    if (getTextsState().mode === 'placing') setTextsMode('idle');
    if (getTextsState().selectedId !== null) selectText(null);
  }
}

/** Wire mutual-exclusion of selection/placing across the three stores. */
export function initSelectionCoordinator(): void {
  let prevMarkerSel = getMarkersState().selectedId;
  let prevMarkerMode = getMarkersState().mode;
  subscribeMarkers((s) => {
    if (s.selectedId !== prevMarkerSel) {
      prevMarkerSel = s.selectedId;
      if (s.selectedId !== null) {
        clearOthersForSelect('markers');
        openEditPanel('markers');
      }
    }
    if (s.mode !== prevMarkerMode) {
      prevMarkerMode = s.mode;
      if (s.mode === 'placing') clearOthersForPlacing('markers');
    }
  });

  let prevZoneSel = getZonesState().selectedId;
  let prevZoneMode = getZonesState().mode;
  subscribeZones((s) => {
    if (s.selectedId !== prevZoneSel) {
      prevZoneSel = s.selectedId;
      if (s.selectedId !== null) {
        clearOthersForSelect('zones');
        openEditPanel('zones');
      }
    }
    if (s.mode !== prevZoneMode) {
      prevZoneMode = s.mode;
      if (s.mode === 'placing') clearOthersForPlacing('zones');
    }
  });

  let prevTextSel = getTextsState().selectedId;
  let prevTextMode = getTextsState().mode;
  subscribeTexts((s) => {
    if (s.selectedId !== prevTextSel) {
      prevTextSel = s.selectedId;
      if (s.selectedId !== null) {
        clearOthersForSelect('texts');
        openEditPanel('texts');
      }
    }
    if (s.mode !== prevTextMode) {
      prevTextMode = s.mode;
      if (s.mode === 'placing') clearOthersForPlacing('texts');
    }
  });
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/selection-coordinator.ts
git commit -m "feat(lib): extract selection-coordinator from index"
```

---

### Task 4.3: Extract `lib/zoom-controls.ts`

**Files:**

- Create: `src/lib/zoom-controls.ts`

- [ ] **Step 1: Create the module**

Create `src/lib/zoom-controls.ts`:

```ts
import { whenMapReady } from './leaflet-map-ref';
import { getState as getZonesState } from './zones-store';

/** Wire the bottom-right zoom-in / zoom-out / zoom-fit buttons. */
export function initZoomControls(showToast: (message: string) => void): void {
  const zoomInBtn = document.querySelector<HTMLButtonElement>('button[data-action="zoom-in"]');
  const zoomOutBtn = document.querySelector<HTMLButtonElement>('button[data-action="zoom-out"]');
  const zoomFitBtn = document.querySelector<HTMLButtonElement>('button[data-action="zoom-fit"]');

  zoomInBtn?.addEventListener('click', () => {
    whenMapReady((map) => map.zoomIn());
  });
  zoomOutBtn?.addEventListener('click', () => {
    whenMapReady((map) => map.zoomOut());
  });
  zoomFitBtn?.addEventListener('click', () => {
    const playArea = getZonesState().zones.find((z) => z.isPlayArea);
    if (!playArea) {
      showToast('Aucune zone de jeu définie');
      return;
    }
    whenMapReady((map) => {
      map.flyToBounds(playArea.points as [number, number][], {
        padding: [40, 40],
        duration: 0.6,
      });
    });
  });
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/zoom-controls.ts
git commit -m "feat(lib): extract zoom-controls from index"
```

---

### Task 4.4: Extract `lib/settings-controls.ts`

**Files:**

- Create: `src/lib/settings-controls.ts`

This owns the grid radios, grid-step select, and cursor-coords toggle wiring (index.astro lines ~157-207). It takes the initial settings to set initial control state.

- [ ] **Step 1: Create the module**

Create `src/lib/settings-controls.ts`:

```ts
import { subscribe as subscribeSettings, update as updateSettings } from './settings-store';
import type { SettingsState } from '../data/settings';

/** Bind the Settings panel controls (grid on/off, step, cursor coords). */
export function initSettingsControls(initial: SettingsState): void {
  const gridRadios = document.querySelectorAll<HTMLInputElement>('input[data-setting="show-grid"]');
  if (gridRadios.length) {
    const setRadioChecked = (showGrid: boolean): void => {
      for (const r of gridRadios) {
        r.checked = (r.value === 'yes') === showGrid;
      }
    };
    setRadioChecked(initial.showGrid);
    for (const r of gridRadios) {
      r.addEventListener('change', () => {
        if (!r.checked) return;
        updateSettings({ showGrid: r.value === 'yes' });
      });
    }
    subscribeSettings((s) => setRadioChecked(s.showGrid));
  }

  const gridStepSelect = document.querySelector<HTMLSelectElement>(
    'select[data-setting="grid-step"]',
  );
  if (gridStepSelect) {
    gridStepSelect.value = String(initial.gridStep);
    gridStepSelect.addEventListener('change', () => {
      const raw = gridStepSelect.value;
      const next = raw === 'auto' ? 'auto' : Number(raw);
      updateSettings({ gridStep: next });
    });
    subscribeSettings((s) => {
      const v = String(s.gridStep);
      if (gridStepSelect.value !== v) gridStepSelect.value = v;
    });
  }

  const cursorCoordsToggle = document.querySelector<HTMLInputElement>(
    'input[data-setting="show-cursor-coords"]',
  );
  if (cursorCoordsToggle) {
    cursorCoordsToggle.checked = initial.showCursorCoords;
    cursorCoordsToggle.disabled = !initial.showGrid;
    cursorCoordsToggle.addEventListener('change', () => {
      updateSettings({ showCursorCoords: cursorCoordsToggle.checked });
    });
    subscribeSettings((s) => {
      if (cursorCoordsToggle.checked !== s.showCursorCoords)
        cursorCoordsToggle.checked = s.showCursorCoords;
      if (cursorCoordsToggle.disabled !== !s.showGrid) cursorCoordsToggle.disabled = !s.showGrid;
    });
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build` → 0 errors. (The type `SettingsState` is exported from `src/data/settings.ts` — verified.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/settings-controls.ts
git commit -m "feat(lib): extract settings-controls from index"
```

---

### Task 4.5: Extract `lib/print-controls.ts`

**Files:**

- Create: `src/lib/print-controls.ts`

This owns the print preview wiring (index.astro lines ~383-435). It needs the title/terrain input values at open time, so it takes getters.

- [ ] **Step 1: Create the module**

Create `src/lib/print-controls.ts`:

```ts
import {
  getState as getPrintState,
  setActive as setPrintActive,
  setOrientation as setPrintOrientation,
  subscribe as subscribePrint,
} from './print-store';

interface PrintControlsDeps {
  /** Current operation title (committed or in-progress). */
  getTitle(): string;
  /** Current terrain name (committed or in-progress). */
  getTerrain(): string;
}

/** Wire the print-preview controls (open, print, exit, orientation, Escape). */
export function initPrintControls({ getTitle, getTerrain }: PrintControlsDeps): void {
  const printFrame = document.querySelector<HTMLElement>('[data-print-frame]');
  const printOpEl = document.querySelector<HTMLElement>('[data-print-op]');
  const printTerrainEl = document.querySelector<HTMLElement>('[data-print-terrain]');
  const openPrintBtn = document.querySelector<HTMLButtonElement>('button[data-action="print"]');
  const printNowBtn = document.querySelector<HTMLButtonElement>('button[data-action="print-now"]');
  const printExitBtn = document.querySelector<HTMLButtonElement>(
    'button[data-action="print-exit"]',
  );
  const orientationRadios = document.querySelectorAll<HTMLInputElement>(
    'input[data-print="orientation"]',
  );

  const syncPrintDom = (): void => {
    const s = getPrintState();
    document.body.dataset.printPreview = String(s.active);
    if (printFrame) printFrame.dataset.orientation = s.orientation;
  };

  const openPrintPreview = (): void => {
    if (printOpEl) printOpEl.textContent = getTitle();
    if (printTerrainEl) printTerrainEl.textContent = getTerrain();
    setPrintActive(true);
  };

  openPrintBtn?.addEventListener('click', openPrintPreview);
  printNowBtn?.addEventListener('click', () => window.print());
  printExitBtn?.addEventListener('click', () => setPrintActive(false));

  for (const radio of orientationRadios) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const value = radio.value;
      if (value === 'landscape' || value === 'portrait') {
        setPrintOrientation(value);
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && getPrintState().active) {
      event.preventDefault();
      setPrintActive(false);
    }
  });

  subscribePrint(syncPrintDom);
  syncPrintDom();
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/print-controls.ts
git commit -m "feat(lib): extract print-controls from index"
```

---

### Task 4.6: Extract `lib/persistence-controls.ts`

**Files:**

- Create: `src/lib/persistence-controls.ts`

This owns Save/Export/Import buttons + `applyState` (index.astro lines ~365-381, 437-482). It takes the dependencies it needs from the bootstrap (showToast, the input refs, hydrate refs).

- [ ] **Step 1: Create the module**

Create `src/lib/persistence-controls.ts`:

```ts
import { exportToFile, importFromFile, saveNow, update, type PersistedState } from './storage';
import { whenMapReady } from './leaflet-map-ref';
import { hydrate as hydrateMarkers } from './markers-store';
import { hydrate as hydrateZones } from './zones-store';
import { hydrate as hydrateTexts } from './texts-store';
import { hydrate as hydrateSettings } from './settings-store';

interface PersistenceDeps {
  titleInput: HTMLInputElement;
  terrainInput: HTMLInputElement;
  showToast: (message: string) => void;
  commitTitle: () => void;
  commitTerrain: () => void;
  /** Called after hydrating, so the bootstrap can refresh its persistence refs. */
  onStateApplied: () => void;
}

/** Wire the Sauvegarder / Exporter / Importer buttons. */
export function initPersistenceControls(deps: PersistenceDeps): void {
  const { titleInput, terrainInput, showToast, commitTitle, commitTerrain, onStateApplied } = deps;

  const applyState = (next: PersistedState): void => {
    update(next);
    saveNow();
    titleInput.value = next.title;
    terrainInput.value = next.terrain;
    hydrateMarkers(next.markers);
    hydrateZones(next.zones);
    hydrateTexts(next.texts);
    hydrateSettings(next.settings);
    onStateApplied();
    whenMapReady((map) => {
      map.setView(next.view.center, next.view.zoom);
    });
  };

  const saveBtn = document.querySelector<HTMLButtonElement>('button[data-action="save"]');
  saveBtn?.addEventListener('click', () => {
    commitTitle();
    commitTerrain();
    saveNow();
    showToast('Sauvegardé');
  });

  const exportBtn = document.querySelector<HTMLButtonElement>('button[data-action="export"]');
  exportBtn?.addEventListener('click', () => {
    exportToFile();
  });

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';

  const importBtn = document.querySelector<HTMLButtonElement>('button[data-action="import"]');
  importBtn?.addEventListener('click', () => {
    if (!confirm("Remplacer l'opération en cours ?")) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const next = await importFromFile(file);
      applyState(next);
      showToast('Importé');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fichier invalide');
    } finally {
      fileInput.value = '';
    }
  });
}
```

> Note: in the original, `applyState` also reset the `lastMarkersRef`/
> `lastZonesRef`/`lastTextsRef` persistence guards. That responsibility now
> belongs to the bootstrap, which exposes `onStateApplied()` (see Task 4.7) to
> refresh those refs after hydration.

- [ ] **Step 2: Verify build passes**

Run: `npm run build` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/persistence-controls.ts
git commit -m "feat(lib): extract persistence-controls from index"
```

---

### Task 4.7: Extract `lib/app-bootstrap.ts`

**Files:**

- Create: `src/lib/app-bootstrap.ts`

This owns: building defaults, `bootstrap()`, hydrating the 4 stores, the persistence-on-change wiring (the `lastXRef` guards), exposing `window.__opsMapBoot` + `ops-map:boot`, and the title/terrain input commit logic. It returns the handles the other controls need.

- [ ] **Step 1: Create the module**

Create `src/lib/app-bootstrap.ts`:

```ts
import {
  getState as getMarkersState,
  hydrate as hydrateMarkers,
  subscribe as subscribeMarkers,
} from './markers-store';
import {
  getState as getZonesState,
  hydrate as hydrateZones,
  subscribe as subscribeZones,
} from './zones-store';
import {
  getState as getTextsState,
  hydrate as hydrateTexts,
  subscribe as subscribeTexts,
} from './texts-store';
import { hydrate as hydrateSettings, subscribe as subscribeSettings } from './settings-store';
import { bootstrap, update, type PersistedState } from './storage';

export interface AppBoot {
  state: PersistedState;
  restored: boolean;
  titleInput: HTMLInputElement;
  terrainInput: HTMLInputElement;
  commitTitle: () => void;
  commitTerrain: () => void;
  /** Refresh the persistence guards after an external applyState/hydrate. */
  refreshPersistenceRefs: () => void;
}

/**
 * Boot the app: restore persisted state, hydrate stores, wire persistence,
 * expose the initial view to Map.astro, and bind title/terrain inputs.
 * Returns null if the required inputs are missing (page without settings panel).
 */
export function initApp(): AppBoot | null {
  const titleInput = document.querySelector<HTMLInputElement>('#op-title');
  const terrainInput = document.querySelector<HTMLInputElement>('#op-terrain');
  if (!titleInput || !terrainInput) return null;

  const defaults: PersistedState = {
    version: 8,
    savedAt: new Date().toISOString(),
    title: titleInput.value,
    terrain: terrainInput.value,
    view: { center: [46.2, 2.2], zoom: 6 },
    markers: [],
    zones: [],
    texts: [],
    settings: { showGrid: false, gridStep: 'auto', showCursorCoords: false },
  };

  const { state, restored } = bootstrap(defaults);

  titleInput.value = state.title;
  terrainInput.value = state.terrain;

  window.__opsMapBoot = { view: state.view, restored };
  window.dispatchEvent(new Event('ops-map:boot'));

  // Persist on array changes only (selection/mode reuse the same ref).
  hydrateMarkers(state.markers);
  let lastMarkersRef = getMarkersState().markers;
  subscribeMarkers((s) => {
    if (s.markers === lastMarkersRef) return;
    lastMarkersRef = s.markers;
    update({ markers: [...s.markers] });
  });

  hydrateZones(state.zones);
  let lastZonesRef = getZonesState().zones;
  subscribeZones((s) => {
    if (s.zones === lastZonesRef) return;
    lastZonesRef = s.zones;
    update({ zones: [...s.zones] });
  });

  hydrateTexts(state.texts);
  let lastTextsRef = getTextsState().texts;
  subscribeTexts((s) => {
    if (s.texts === lastTextsRef) return;
    lastTextsRef = s.texts;
    update({ texts: [...s.texts] });
  });

  hydrateSettings(state.settings);
  subscribeSettings((s) => {
    update({ settings: { ...s } });
  });

  const commitTitle = (): void => {
    update({ title: titleInput.value });
  };
  const commitTerrain = (): void => {
    update({ terrain: terrainInput.value });
  };

  titleInput.addEventListener('change', commitTitle);
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleInput.blur();
    }
  });

  terrainInput.addEventListener('change', commitTerrain);
  terrainInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      terrainInput.blur();
    }
  });

  const refreshPersistenceRefs = (): void => {
    lastMarkersRef = getMarkersState().markers;
    lastZonesRef = getZonesState().zones;
    lastTextsRef = getTextsState().texts;
  };

  return {
    state,
    restored,
    titleInput,
    terrainInput,
    commitTitle,
    commitTerrain,
    refreshPersistenceRefs,
  };
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build` → 0 errors. The `window.__opsMapBoot` global type is declared via `declare global` in `src/lib/storage.ts:18` (verified) — Astro's TypeScript picks it up project-wide, so `app-bootstrap.ts` needs no extra declaration.

- [ ] **Step 3: Commit**

```bash
git add src/lib/app-bootstrap.ts
git commit -m "feat(lib): extract app-bootstrap from index"
```

---

### Task 4.8: Rewire `index.astro` to orchestrate the modules

**Files:**

- Modify: `src/pages/index.astro` (replace the entire `<script>` block)

- [ ] **Step 1: Replace the script block**

Replace the whole `<script>…</script>` block (lines ~53-484) with:

```astro
<script>
  import { initApp } from "../lib/app-bootstrap";
  import { initSelectionCoordinator } from "../lib/selection-coordinator";
  import { initSettingsControls } from "../lib/settings-controls";
  import { initZoomControls } from "../lib/zoom-controls";
  import { initPrintControls } from "../lib/print-controls";
  import { initPersistenceControls } from "../lib/persistence-controls";
  import { createToast } from "../lib/toast";

  const boot = initApp();
  if (boot) {
    const showToast = createToast();

    initSettingsControls(boot.state.settings);
    initSelectionCoordinator();
    initZoomControls(showToast);
    initPrintControls({
      getTitle: () => boot.titleInput.value,
      getTerrain: () => boot.terrainInput.value,
    });
    initPersistenceControls({
      titleInput: boot.titleInput,
      terrainInput: boot.terrainInput,
      showToast,
      commitTitle: boot.commitTitle,
      commitTerrain: boot.commitTerrain,
      onStateApplied: boot.refreshPersistenceRefs,
    });
  }
</script>
```

The frontmatter (imports of components, the `<html>`/`<body>` template) is unchanged.

- [ ] **Step 2: Verify build passes**

Run: `npm run build` → 0 errors.

- [ ] **Step 3: Full manual regression check**

Run: `npm run dev`. Exercise the whole app and confirm no behavior changed:

- Boot: reload with saved state → view (center/zoom) and title/terrain restored.
- Selection mutual-exclusion: select a marker, then a zone → marker deselects, zone panel opens. Same for texts. Enter placing mode in one → others reset.
- Settings: toggle grid Oui/Non, change step, toggle cursor coords (disabled when grid off).
- Zoom: zoom-in/out; zoom-fit with no play area → toast "Aucune zone de jeu définie"; with a play area → flies to bounds.
- Title/terrain: edit, Enter blurs and commits.
- Save → toast "Sauvegardé". Export → file downloads. Import a valid file → state replaces, toast "Importé"; import invalid → alert.
- Print: open preview (band shows current title/terrain), change orientation, Escape exits, Imprimer triggers `window.print()`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "refactor(index): orchestrate extracted lib modules, slim the page script"
```

---

## Self-Review notes (resolved)

- **Spec coverage:** Lot 1 (data + button.css) ✓ Tasks 1.1-1.2. Lot 2 (form components + form.css) ✓ Tasks 2.1-2.6. Lot 3 (EditorShell + editor-binding) ✓ Tasks 3.1-3.5. Lot 4 (index split into 7 lib modules) ✓ Tasks 4.1-4.8.
- **Type consistency:** Helper names are stable across tasks — `commit`, `bindColorSwatches`, `bindTextField`, `reflectChecked` (defined 3.1, used 3.3/3.4/3.5); `initApp`, `initSelectionCoordinator`, `initSettingsControls`, `initZoomControls`, `initPrintControls`, `initPersistenceControls`, `createToast` (defined 4.1-4.7, wired 4.8). `AppBoot.refreshPersistenceRefs` ↔ `onStateApplied` linkage is explicit.
- **Pre-verified against source:** `SettingsState` is the exported type in `src/data/settings.ts` (Task 4.4). `window.__opsMapBoot` is globally declared in `src/lib/storage.ts:18`, so the extracted `app-bootstrap.ts` compiles without a new declaration (Task 4.7).
- **Out of scope (per spec):** PanelGroup's native-radio segmented controls (grid Oui/Non, print orientation) are intentionally left untouched to preserve form `name=` grouping semantics; the styleguide page is not modified.
