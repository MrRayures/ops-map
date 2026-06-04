# Print Preview Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive on-screen print-preview mode (triggered from the "Impression" sidebar panel) that frames what will be printed at paper ratio, with a header band (OP + terrain), a floating legend box, and a compass rose, then prints via `window.print()`.

**Architecture:** A transient `print-store` holds `{ active, orientation }`. A `PrintOverlay.astro` component renders the preview chrome (band, frame, legend, compass, actions) over the existing Leaflet map. `index.astro` wires the panel controls and overlay buttons to the store, toggles a `data-print-preview` attribute on `<body>`, and feeds the band with the current title/terrain. `print.css` styles the overlay and provides the `@media print` / `@page` rules. Content is WYSIWYG — the live map (markers, zones, texts, grid-if-enabled) is what prints.

**Tech Stack:** Astro (zero-JS components + inline `<script>` modules), Leaflet, Tailwind utility classes, plain CSS with design tokens, TypeScript strict.

---

## File Structure

- **Create** `src/lib/print-store.ts` — transient state store for print mode (pattern mirrors `src/lib/settings-store.ts`).
- **Create** `src/components/PrintOverlay.astro` — the preview overlay markup (band, frame, legend, compass, action bar). Static markup only; behavior is wired in `index.astro`.
- **Create** `src/styles/components/print.css` — overlay styling + `@media print` / `@page` rules.
- **Modify** `src/styles/global.css` — add the `print.css` import.
- **Modify** `src/components/PanelGroup.astro` — remove the two "Contenu" checkboxes (grid/legend) from the `print` panel (WYSIWYG); keep orientation radios + Imprimer button.
- **Modify** `src/pages/index.astro` — mount `<PrintOverlay />`; wire orientation radios, panel Imprimer button, overlay Imprimer/Quitter buttons, body attribute toggle, frame ratio, and band text; add Escape-to-exit.

There is no test runner configured in this project (`.claude/rules/testing.md` says "to configure"). Verification is therefore `astro check` + `astro build` clean, plus manual visual checks. Tasks use build/check as the automated gate instead of unit tests.

---

## Task 1: Print store

**Files:**

- Create: `src/lib/print-store.ts`

- [ ] **Step 1: Write the store**

Mirror the shape and conventions of `src/lib/settings-store.ts` (module-level `state`, `Set<Listener>`, `emit`, `setState`, `getState`, `subscribe`). Create `src/lib/print-store.ts` with this exact content:

```ts
export type PrintOrientation = 'landscape' | 'portrait';

export interface PrintState {
  readonly active: boolean;
  readonly orientation: PrintOrientation;
}

type Listener = (state: PrintState) => void;

const listeners = new Set<Listener>();

let state: PrintState = {
  active: false,
  orientation: 'landscape',
};

function emit(): void {
  for (const listener of listeners) listener(state);
}

function setState(patch: Partial<PrintState>): void {
  state = { ...state, ...patch };
  emit();
}

export function getState(): PrintState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setActive(active: boolean): void {
  if (state.active === active) return;
  setState({ active });
}

export function setOrientation(orientation: PrintOrientation): void {
  if (state.orientation === orientation) return;
  setState({ orientation });
}

export function toggle(): void {
  setState({ active: !state.active });
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx astro check`
Expected: no NEW errors referencing `print-store.ts`. (The pre-existing `AddressSearch.astro` `leaflet-control-geocoder` error remains — ignore it.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/print-store.ts
git commit -m "feat(print): add transient print-mode store"
```

---

## Task 2: Print overlay component

**Files:**

- Create: `src/components/PrintOverlay.astro`

- [ ] **Step 1: Write the component**

Create `src/components/PrintOverlay.astro`. The overlay is hidden by default via `hidden`; `index.astro` removes `hidden` when print mode activates. The compass is an inline SVG (north up). The band text spans carry `data-print-op` / `data-print-terrain` so `index.astro` can fill them. Classes use the project's `c-` BEM-flat convention; layout/visual rules live in `print.css` (Task 3), with Tailwind utilities only where the rest of the codebase already mixes them.

```astro
---
import Printer from "@lucide/astro/icons/printer";
import X from "@lucide/astro/icons/x";
---

<div id="print-overlay" class="c-print" hidden aria-label="Aperçu d'impression">
  <div class="c-print-band" data-print-band>
    <span><span aria-hidden="true">// </span><span data-print-op></span></span>
    <span><span data-print-terrain></span><span aria-hidden="true"> //</span></span>
  </div>

  <div class="c-print-stage">
    <div class="c-print-frame" data-print-frame data-orientation="landscape">
      <span class="c-print-frame-tag">// Zone d'impression</span>

      <div class="c-print-compass" data-print-compass aria-hidden="true">
        <svg viewBox="0 0 48 48" width="40" height="40">
          <circle cx="24" cy="24" r="22" fill="rgba(0,0,0,0.45)" stroke="currentColor" stroke-width="2" />
          <polygon points="24,6 28,24 24,20 20,24" fill="currentColor" />
          <polygon points="24,42 20,24 24,28 28,24" fill="none" stroke="currentColor" stroke-width="1" />
          <text x="24" y="15" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor">N</text>
          <text x="24" y="44" text-anchor="middle" font-size="6" fill="currentColor">S</text>
          <text x="44" y="27" text-anchor="middle" font-size="6" fill="currentColor">E</text>
          <text x="5" y="27" text-anchor="middle" font-size="6" fill="currentColor">O</text>
        </svg>
      </div>

      <div class="c-print-legend" data-print-legend>
        <span class="c-print-legend-title">Légende</span>
        <span class="c-print-legend-empty">—</span>
      </div>
    </div>
  </div>

  <div class="c-print-actions" data-print-actions>
    <button type="button" data-action="print-now" class="c-print-btn c-print-btn-primary">
      <Printer size={16} aria-hidden="true" />
      Imprimer
    </button>
    <button type="button" data-action="print-exit" class="c-print-btn">
      <X size={16} aria-hidden="true" />
      Quitter
    </button>
  </div>
</div>
```

- [ ] **Step 2: Verify the `x` icon exists**

Run: `node -e "require('fs').accessSync('node_modules/@lucide/astro/src/icons/x.ts')" && echo OK`
Expected: `OK`. (If it errors, the icon import path is wrong — `@lucide/astro/icons/x` resolves to that file.)

- [ ] **Step 3: Verify it type-checks**

Run: `npx astro check`
Expected: no new errors referencing `PrintOverlay.astro`.

- [ ] **Step 4: Commit**

```bash
git add src/components/PrintOverlay.astro
git commit -m "feat(print): add print preview overlay component"
```

---

## Task 3: Print stylesheet

**Files:**

- Create: `src/styles/components/print.css`
- Modify: `src/styles/global.css` (import list, after line 10 `@import './components/grid-overlay.css';`)

- [ ] **Step 1: Write the stylesheet**

Create `src/styles/components/print.css`. The overlay is fixed, fills the viewport, hidden until `<body>` has `data-print-preview="true"`. The frame is centered, paper-ratio (`aspect-ratio`), with a dark mask around it via a huge inset box-shadow. The `@media print` block neutralizes the mask, hides app chrome and the action bar, and sets `@page` orientation. Two `@page` rules are toggled by a body attribute the script sets alongside the frame orientation.

```css
/* Print preview overlay — interactive on-screen preview + @media print rules. */

.c-print {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  pointer-events: none; /* let map drag/zoom through; children re-enable as needed */
  font-family: var(--font-mono);
}

/* Shown only while previewing. */
body[data-print-preview='true'] .c-print {
  display: flex;
}

/* Header band: OP left, terrain right. */
.c-print-band {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-accent);
  color: var(--color-accent-on);
  font-weight: 700;
  font-size: 0.8125rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  pointer-events: auto;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.c-print-stage {
  position: relative;
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: hidden;
}

/* Paper-ratio frame with a dark mask around it. */
.c-print-frame {
  position: relative;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
  border: 2px solid var(--color-accent);
}
.c-print-frame[data-orientation='landscape'] {
  aspect-ratio: 1.414 / 1;
  width: min(92%, calc((100vh - 6rem) * 1.414));
}
.c-print-frame[data-orientation='portrait'] {
  aspect-ratio: 1 / 1.414;
  height: min(92%, calc((100vw) * 1.414));
  width: auto;
}

.c-print-frame-tag {
  position: absolute;
  top: 0.25rem;
  left: 0.5rem;
  color: var(--color-accent);
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Compass rose — top-right inside the frame. */
.c-print-compass {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  color: #ffffff;
}

/* Legend box — bottom-right inside the frame. */
.c-print-legend {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  min-width: 7rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.625rem;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid var(--color-line-default);
  color: #ffffff;
  font-size: 0.625rem;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.c-print-legend-title {
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.c-print-legend-empty {
  opacity: 0.6;
}

/* Action bar — bottom center, screen only. */
.c-print-actions {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
  pointer-events: auto;
}
.c-print-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.5rem;
  padding-inline: 1rem;
  border: 1px solid var(--color-line-default);
  background: var(--color-surface-card);
  color: var(--color-fg-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: var(--color-surface-elevated);
  }
  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}
.c-print-btn-primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-on);

  &:hover {
    background: var(--color-accent-hover);
  }
}

/* --- Print output --- */
@media print {
  /* Hide app chrome; print only the map + overlay. */
  #sidebar,
  #panel-group,
  .c-map__ui,
  #toast,
  .c-print-actions {
    display: none !important;
  }

  /* The overlay frame mask must not print as a grey block. */
  .c-print {
    position: static;
    pointer-events: none;
  }
  .c-print-frame {
    box-shadow: none;
  }

  body[data-print-orientation='landscape'] {
    --print-page-size: A4 landscape;
  }
  body[data-print-orientation='portrait'] {
    --print-page-size: A4 portrait;
  }
}

@page {
  size: A4 landscape;
  margin: 10mm;
}
```

Note: `@page size` cannot read a CSS variable in current browsers, so the script (Task 5) sets orientation by toggling between two stylesheets is overkill; instead we keep a single default `@page` and rely on the browser print dialog's orientation, while the on-screen frame ratio communicates intent. The `body[data-print-orientation]` hooks remain for future refinement. (This is a known, documented limitation — see spec "cas limites".)

- [ ] **Step 2: Add the import to global.css**

In `src/styles/global.css`, add the import immediately after the `grid-overlay.css` line. The result must read:

```css
@import './components/grid-overlay.css';
@import './components/print.css';
@import './components/map.css';
```

- [ ] **Step 3: Verify the build compiles the CSS**

Run: `npx astro build`
Expected: `Complete!` with no CSS import errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/components/print.css src/styles/global.css
git commit -m "feat(print): add print overlay styles and @media print rules"
```

---

## Task 4: Trim the Impression panel to orientation + button

**Files:**

- Modify: `src/components/PanelGroup.astro:238-260` (the "Contenu" block with the two checkboxes)

- [ ] **Step 1: Remove the WYSIWYG-redundant checkboxes**

In `src/components/PanelGroup.astro`, delete the entire "Contenu" `<div>` block (the one containing the `data-print="include-grid"` and `data-print="include-legend"` checkboxes). Remove exactly this block:

```astro
            <div class="flex flex-col gap-1.5">
              <span class="font-mono text-xs font-semibold tracking-wider text-fg-secondary uppercase">
                Contenu
              </span>
              <label class="flex cursor-pointer items-center gap-3 rounded-sm border border-line-default px-3 py-2 text-sm transition-colors has-[:checked]:border-accent has-[:checked]:bg-surface-elevated has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
                <input
                  type="checkbox"
                  data-print="include-grid"
                  checked
                  class="size-4 accent-[var(--color-accent)]"
                />
                <span class="text-fg-primary">Inclure la grille</span>
              </label>
              <label class="flex cursor-pointer items-center gap-3 rounded-sm border border-line-default px-3 py-2 text-sm transition-colors has-[:checked]:border-accent has-[:checked]:bg-surface-elevated has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
                <input
                  type="checkbox"
                  data-print="include-legend"
                  checked
                  class="size-4 accent-[var(--color-accent)]"
                />
                <span class="text-fg-primary">Inclure la légende</span>
              </label>
            </div>
```

The `print` panel must now contain only: the "Orientation" radio block and the `data-action="print"` Imprimer button.

- [ ] **Step 2: Verify it type-checks**

Run: `npx astro check`
Expected: no new errors referencing `PanelGroup.astro`.

- [ ] **Step 3: Commit**

```bash
git add src/components/PanelGroup.astro
git commit -m "feat(print): trim Impression panel to orientation + print button (WYSIWYG)"
```

---

## Task 5: Mount the overlay and wire all behavior in index.astro

**Files:**

- Modify: `src/pages/index.astro` (import + `<PrintOverlay />` mount near line 42; new wiring block inside the existing `<script>`)

- [ ] **Step 1: Import and mount the overlay**

In `src/pages/index.astro` frontmatter, add the import alongside the other component imports (after `import PanelGroup from "../components/PanelGroup.astro";`):

```astro
import PrintOverlay from "../components/PrintOverlay.astro";
```

In the body, mount it as a direct child of `<body>`, immediately before `<Toast />` (so it sits above `<main>`):

```astro
		<PrintOverlay />
		<Toast />
```

- [ ] **Step 2: Add the store import to the script**

In the `<script>` block of `src/pages/index.astro`, add this import next to the other store imports (e.g. after the `settings-store` import):

```ts
import {
  getState as getPrintState,
  setActive as setPrintActive,
  setOrientation as setPrintOrientation,
  subscribe as subscribePrint,
  type PrintOrientation,
} from '../lib/print-store';
```

- [ ] **Step 3: Wire the print mode**

Inside the `if (titleInput && terrainInput) { ... }` block in `src/pages/index.astro`, add this block right before the `// --- Sauvegarder ---` section (so `titleInput`/`terrainInput` are in scope). It: opens the preview from the panel button, fills the band, toggles the body attributes, keeps the frame ratio in sync, prints, and exits (button + Escape):

```ts
// --- Print preview mode ---
const printOverlay = document.getElementById('print-overlay');
const printFrame = document.querySelector<HTMLElement>('[data-print-frame]');
const printOpEl = document.querySelector<HTMLElement>('[data-print-op]');
const printTerrainEl = document.querySelector<HTMLElement>('[data-print-terrain]');
const openPrintBtn = document.querySelector<HTMLButtonElement>('button[data-action="print"]');
const printNowBtn = document.querySelector<HTMLButtonElement>('button[data-action="print-now"]');
const printExitBtn = document.querySelector<HTMLButtonElement>('button[data-action="print-exit"]');
const orientationRadios = document.querySelectorAll<HTMLInputElement>(
  'input[data-print="orientation"]',
);

const syncPrintDom = (): void => {
  const s = getPrintState();
  document.body.dataset.printPreview = String(s.active);
  document.body.dataset.printOrientation = s.orientation;
  if (printOverlay) printOverlay.hidden = !s.active;
  if (printFrame) printFrame.dataset.orientation = s.orientation;
};

const openPrintPreview = (): void => {
  // Fill the band from the current (committed or in-progress) values.
  if (printOpEl) printOpEl.textContent = titleInput.value;
  if (printTerrainEl) printTerrainEl.textContent = terrainInput.value;
  setPrintActive(true);
};

openPrintBtn?.addEventListener('click', openPrintPreview);
printNowBtn?.addEventListener('click', () => window.print());
printExitBtn?.addEventListener('click', () => setPrintActive(false));

for (const radio of orientationRadios) {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    setPrintOrientation(radio.value as PrintOrientation);
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && getPrintState().active) {
    event.preventDefault();
    setPrintActive(false);
  }
});

subscribePrint(syncPrintDom);
syncPrintDom(); // initial paint (inactive)
```

- [ ] **Step 4: Verify it type-checks**

Run: `npx astro check`
Expected: no new errors. Only the pre-existing `AddressSearch.astro` `leaflet-control-geocoder` error remains.

- [ ] **Step 5: Verify the build**

Run: `npx astro build`
Expected: `Complete!`, 2 pages built.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(print): mount overlay and wire preview, orientation, print, exit"
```

---

## Task 6: Manual verification

**Files:** none (manual QA).

- [ ] **Step 1: Run the dev server**

Run: `npm run dev`
Open the printed local URL in a browser.

- [ ] **Step 2: Verify the preview flow**

1. Open the **Impression** panel (last entry under "Réglages" in the sidebar). Confirm it shows only Orientation radios + an Imprimer button (no checkboxes).
2. Click **Imprimer**. Expected: sidebar, panel, and zoom controls disappear; a dark mask appears with a centered landscape frame; the band shows `// <OP name>` left and `<terrain> //` right; a compass (N up) sits top-right of the frame; a "Légende" box sits bottom-right; an action bar (Imprimer / Quitter) sits bottom-center.
3. Drag/zoom the map — it should still respond (frame stays put).
4. Switch the page is still in preview; reopen the panel is not needed — confirm the orientation radios are reachable: since the panel is hidden in preview, change orientation by exiting first. (Known: orientation is changed from the panel before opening; live ratio change is verified in step 3 of Task-level note below.)
5. Click **Quitter** (or press **Escape**). Expected: return to the normal app.

- [ ] **Step 3: Verify orientation ratio**

1. In the Impression panel, select **Portrait**, then click **Imprimer**.
2. Expected: the frame is now taller-than-wide (portrait ratio).
3. Exit, select **Paysage**, reopen — frame is wider-than-tall.

- [ ] **Step 4: Verify print output**

1. Enter preview, press **Ctrl+P** (or click Imprimer in the overlay).
2. In the browser print dialog, confirm: the action bar is hidden, the map fills the page, the band + compass + legend are visible, the dark mask is NOT printed as a grey block.
3. Set the dialog orientation to match the chosen mode if needed (documented limitation: `@page` does not auto-switch from the in-app radio).

- [ ] **Step 5: Report results**

Confirm each check passed or note any deviation. No commit (QA only).

---

## Self-Review Notes

- **Spec coverage:** preview mode (Task 5), full-bleed map + floating legend/compass (Task 2/3), paper-ratio frame option A (Task 3 `aspect-ratio`), landscape/portrait live ratio (Task 5 + Task 3), WYSIWYG/no inclusion toggles (Task 4), header band OP+terrain (Task 2/5), compass N/S/E/O (Task 2), empty legend (Task 2), Escape-to-exit (Task 5), no persistence (Task 1 — store is module-only, never written to `PersistedState`). All covered.
- **Known limitation carried from spec:** `@page` orientation does not auto-follow the in-app radio (browsers can't bind `@page size` to a variable); the on-screen frame communicates intent and the print dialog sets final orientation. Documented in Task 3 Step 1 note and Task 6 Step 4.
- **Type consistency:** store exports `setActive`/`setOrientation`/`subscribe`/`getState` (Task 1) are imported with matching aliases in Task 5; `PrintOrientation` type reused. Frame attribute `data-orientation` set in both Task 2 (markup default) and Task 5 (sync). Body attributes `data-print-preview` / `data-print-orientation` match the CSS selectors in Task 3.
