# Annotation Markers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement in-memory annotation markers — placed via the Tools panel, configurable (shape/color/content/label), editable after selection, draggable, deletable.

**Architecture:** A single ESM-singleton store (`markers-store.ts`) owns the markers array, current selection, and place mode. Three consumers subscribe: `MarkerEditor.astro` (panel form), `MarkerLayer.astro` (Leaflet `L.layerGroup` synced via diff-based updates), and `Map.astro` (cursor + click interception). Markers are rendered via `L.divIcon` with BEM `.c-marker` styling, allowing full design-system token usage and the HUD-style label below the shape.

**Tech Stack:** Astro 6 (static), Leaflet 1.9, TypeScript strict, Tailwind v4. No automated tests — manual `npm run build` + visual verification per phase, per project decision documented in spec.

**Reference spec:** [docs/superpowers/specs/2026-04-27-annotation-markers.md](../specs/2026-04-27-annotation-markers.md)

---

## CRITICAL guardrails (apply to every task)

1. **Class strings VERBATIM.** Tailwind v4 may suggest "canonical" shorthand variants in linter warnings (`has-checked:` for `has-[:checked]:`, `accent-(--color-accent)` for `accent-[var(--color-accent)]`, `tracking-widest` for `tracking-[0.1em]`). **Ignore them.** Reproduce class strings exactly as written. The arbitrary-syntax forms are the spec contract.
2. **No legacy palette.** Zero `slate-*`, `emerald-*`, `text-white`, `bg-white` in any new file. Use Midnight Tactical tokens (`bg-surface-card`, `text-fg-primary`, `border-line-default`, `bg-accent`, etc.).
3. **No automated tests.** Don't add a test runner, don't write `*.test.*` files. Validation is `npm run build` + visual check + commit.
4. **TypeScript strict.** No `any`, no `as any`. Explicit return types on exported functions.
5. **One commit per task** (or per the commit instructions below). Don't bundle.

---

## File Structure

### Created

```
src/data/markers.ts                        Types + constants (MARKER_SHAPES, _COLORS, _ICONS, DEFAULT_MARKER_DRAFT)
src/data/marker-icons.ts                   Raw SVG inner-content per MarkerIconId (8 icons from @lucide/astro)
src/lib/markers-store.ts                   Singleton ESM store with subscribe/getState + mutations
src/styles/components/marker.css           BEM .c-marker + .c-marker-body + .c-marker-text + .c-marker-icon + .c-marker-label + modifiers
src/components/MarkerEditor.astro          Panel-Outils form (idle / placing / selected states)
src/components/MarkerLayer.astro           Bridge store ↔ Leaflet (diff-based L.layerGroup management)
```

### Modified

```
src/components/PanelGroup.astro            Render <MarkerEditor /> inside the tools <article>
src/components/Map.astro                   Emit map:ready CustomEvent + place-mode cursor + click interception
src/pages/index.astro                      Import + render <MarkerLayer /> alongside <Map />
src/pages/styleguide.astro                 Add §I Markers section (visual reference + CSS validation)
src/styles/global.css                      @import "./components/marker.css";
```

---

## Phase 1 — Foundations (data + state)

### Task 1: Types and constants — `markers.ts`

**Files:** Create `src/data/markers.ts`

- [ ] **Step 1: Create the file**

```ts
export type MarkerShape = 'square' | 'triangle' | 'circle' | 'diamond';

export type MarkerColor =
  | 'team-red'
  | 'team-blue'
  | 'team-green'
  | 'team-purple'
  | 'marker-objective'
  | 'marker-spawn'
  | 'marker-danger'
  | 'marker-cover';

export type MarkerIconId =
  | 'flag'
  | 'target'
  | 'shield'
  | 'eye'
  | 'alert-triangle'
  | 'swords'
  | 'radio'
  | 'package';

export type MarkerContent =
  | { kind: 'none' }
  | { kind: 'text'; value: string }
  | { kind: 'icon'; value: MarkerIconId };

export interface Marker {
  id: string;
  lat: number;
  lng: number;
  shape: MarkerShape;
  color: MarkerColor;
  content: MarkerContent;
  label?: string;
}

export type MarkerDraft = Omit<Marker, 'id' | 'lat' | 'lng'>;

export const MARKER_SHAPES: readonly MarkerShape[] = ['square', 'triangle', 'circle', 'diamond'];

export const MARKER_COLORS: readonly MarkerColor[] = [
  'team-red',
  'team-blue',
  'team-green',
  'team-purple',
  'marker-objective',
  'marker-spawn',
  'marker-danger',
  'marker-cover',
];

export const MARKER_ICONS: readonly MarkerIconId[] = [
  'flag',
  'target',
  'shield',
  'eye',
  'alert-triangle',
  'swords',
  'radio',
  'package',
];

export const DEFAULT_MARKER_DRAFT: MarkerDraft = {
  shape: 'square',
  color: 'team-red',
  content: { kind: 'none' },
  label: '',
};

export const MARKER_TEXT_MAX_LENGTH = 3;
```

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds. The new file is not yet imported anywhere; we're just verifying TypeScript syntax.

- [ ] **Step 3: Commit**

```bash
git add src/data/markers.ts
git commit -m "feat(markers): add Marker types and constants

MarkerShape × MarkerColor × MarkerContent (text|icon|none) + 8
Lucide icon IDs. DEFAULT_MARKER_DRAFT (square / team-red / no
content / no label) is the initial state of the editor draft."
```

---

### Task 2: Icon SVG data — `marker-icons.ts`

**Files:** Create `src/data/marker-icons.ts`

The marker rendering is done inside `L.divIcon`'s html string (raw HTML in vanilla JS). We can't use `<MapPin />` Astro components there — we need SVG strings.

The 8 icons live as `.svg` files inside `node_modules/@lucide/astro/icons/`. Each file is a complete `<svg>` element with paths. We extract the **inner content** (everything between `<svg ...>` and `</svg>`) and put it in a record keyed by `MarkerIconId`.

- [ ] **Step 1: Inspect one of the @lucide/astro SVG files**

Run:

```bash
ls node_modules/@lucide/astro/icons/ | grep -E '^(flag|target|shield|eye|alert-triangle|swords|radio|package)\.svg$'
```

Expected: 8 files listed (one per icon ID).

If filenames differ (e.g., `triangle-alert.svg` instead of `alert-triangle.svg`), adapt the file paths accordingly when reading. Lucide has renamed some icons across versions — check the actual filenames present.

Then read one to confirm format:

```bash
cat node_modules/@lucide/astro/icons/flag.svg
```

Expected output is something like:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
```

- [ ] **Step 2: Create the marker-icons.ts file with inner-SVG content per icon**

Open each of the 8 .svg files and extract the **inner** content (drop the `<svg ...>` open and `</svg>` close — keep only the path/circle/line/polyline elements between).

Create `src/data/marker-icons.ts`:

```ts
import type { MarkerIconId } from './markers';

/**
 * Inner SVG content (paths/lines/circles) extracted from @lucide/astro
 * icon files. The wrapping <svg> is added at render time so each marker
 * can size itself uniformly via the .c-marker-icon class.
 *
 * If you change icons or add new ones, keep this map in sync with
 * MARKER_ICONS in markers.ts.
 */
export const MARKER_ICON_INNER_SVG: Record<MarkerIconId, string> = {
  // For each entry: cat node_modules/@lucide/astro/icons/<id>.svg, then copy
  // everything BETWEEN the opening <svg ...> and the closing </svg>. Keep on
  // a single line. Example for "flag" (paths from Lucide v0.469-ish — verify
  // against the file you actually read):
  flag: `<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>`,
  target: `/* paste from target.svg */`,
  shield: `/* paste from shield.svg */`,
  eye: `/* paste from eye.svg */`,
  'alert-triangle': `/* paste from alert-triangle.svg (or triangle-alert.svg) */`,
  swords: `/* paste from swords.svg */`,
  radio: `/* paste from radio.svg */`,
  package: `/* paste from package.svg */`,
};

/**
 * Build a complete <svg> string for a given icon, sized by CSS via the
 * provided className. Width/height defaults to 16 — the marker body is
 * 32px and we want the icon ~50% of body size.
 */
export function buildIconSvg(id: MarkerIconId, className = 'c-marker-icon'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}" aria-hidden="true">${MARKER_ICON_INNER_SVG[id]}</svg>`;
}
```

Replace each `/* paste from X.svg */` placeholder with the inner SVG markup of the corresponding file. Keep them as single-line strings (no internal newlines — easier for divIcon HTML). The `flag` entry above is pre-filled as an anchor example; the implementer fills the other 7 from the actual filesystem.

If an icon name in `MARKER_ICONS` doesn't have a corresponding file (Lucide rename), the spec accepts substitution: pick the closest-matching current Lucide name and update both this file and `markers.ts` consistently. Don't leave stub strings or `/* paste from */` comments in the committed file.

- [ ] **Step 3: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds. TypeScript verifies that `MARKER_ICON_INNER_SVG` covers all 8 keys of `MarkerIconId` (the `Record<MarkerIconId, string>` type makes missing keys a compile error).

- [ ] **Step 4: Commit**

```bash
git add src/data/marker-icons.ts
git commit -m "feat(markers): inline 8 Lucide icon SVGs for marker rendering

L.divIcon takes a raw HTML string, so we can't use the @lucide/astro
component there. Inner SVG paths are inlined as a Record keyed by
MarkerIconId, with a buildIconSvg helper that wraps them with the
shared <svg> attributes (24×24 viewBox, currentColor stroke)."
```

---

### Task 3: Markers store — `markers-store.ts`

**Files:** Create `src/lib/markers-store.ts`

Singleton ESM module that owns the markers array, current selection, place mode, and the editor draft. Pub/sub via a simple listener set.

- [ ] **Step 1: Create the directory and file**

The directory `src/lib/` does not exist yet. Creating the file via the Write tool will create it.

Create `src/lib/markers-store.ts`:

```ts
import { DEFAULT_MARKER_DRAFT, type Marker, type MarkerDraft } from '../data/markers';

export type MarkerMode = 'idle' | 'placing';

export interface MarkersState {
  readonly markers: readonly Marker[];
  readonly selectedId: string | null;
  readonly mode: MarkerMode;
  readonly draft: MarkerDraft;
}

type Listener = (state: MarkersState) => void;

const listeners = new Set<Listener>();

let state: MarkersState = {
  markers: [],
  selectedId: null,
  mode: 'idle',
  draft: { ...DEFAULT_MARKER_DRAFT },
};

function emit(): void {
  for (const listener of listeners) listener(state);
}

function setState(patch: Partial<MarkersState>): void {
  state = { ...state, ...patch };
  emit();
}

export function getState(): MarkersState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setMode(mode: MarkerMode): void {
  if (state.mode === mode) return;
  setState({ mode });
}

export function updateDraft(patch: Partial<MarkerDraft>): void {
  setState({ draft: { ...state.draft, ...patch } });
}

export function createMarker(lat: number, lng: number, draft: MarkerDraft): Marker {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const marker: Marker = { id, lat, lng, ...draft };
  setState({
    markers: [...state.markers, marker],
    selectedId: id,
    mode: 'idle',
  });
  return marker;
}

export function selectMarker(id: string | null): void {
  if (state.selectedId === id) return;
  setState({ selectedId: id });
}

export function updateSelected(patch: Partial<MarkerDraft>): void {
  if (state.selectedId === null) return;
  setState({
    markers: state.markers.map((m) => (m.id === state.selectedId ? { ...m, ...patch } : m)),
  });
}

export function moveSelected(lat: number, lng: number): void {
  if (state.selectedId === null) return;
  setState({
    markers: state.markers.map((m) => (m.id === state.selectedId ? { ...m, lat, lng } : m)),
  });
}

export function deleteSelected(): void {
  if (state.selectedId === null) return;
  setState({
    markers: state.markers.filter((m) => m.id !== state.selectedId),
    selectedId: null,
  });
}
```

Key invariants:

- `subscribe(listener)` returns an unsubscribe function. Use it to detach in cleanup.
- `getState()` returns the current snapshot. Don't mutate the returned object.
- All mutations re-emit the full state to every listener. Listeners do their own diffing.
- `crypto.randomUUID` is the primary id source (available in modern browsers + Node 19+).
  Fallback covers older runtimes during build/dev edge cases.

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/markers-store.ts
git commit -m "feat(markers): add singleton ESM markers store

Pub/sub state management for markers, selection, place mode, and
the editor draft. All mutations are exposed as named functions
(createMarker, updateSelected, etc.). subscribe() returns an
unsubscribe handle. getState() returns a readonly snapshot."
```

---

## Phase 2 — Visual layer (CSS)

### Task 4: Marker CSS — `marker.css` + wire `global.css`

**Files:**

- Create: `src/styles/components/marker.css`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Create `src/styles/components/marker.css`**

```css
.c-marker {
  font-family: var(--font-mono);
  position: relative;
}

.c-marker-body {
  width: 32px;
  height: 32px;
  border: 2px solid var(--color-team-stroke);
  display: grid;
  place-items: center;
  color: var(--color-fg-primary);
  font-weight: 600;
  font-size: 12px;
}

/* Forme */
.c-marker.is-shape-square .c-marker-body {
  border-radius: var(--radius-sm);
}
.c-marker.is-shape-circle .c-marker-body {
  border-radius: 50%;
}
.c-marker.is-shape-triangle .c-marker-body {
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}
.c-marker.is-shape-diamond .c-marker-body {
  transform: rotate(45deg);
}
.c-marker.is-shape-diamond > .c-marker-body > * {
  transform: rotate(-45deg);
}

/* Couleur */
.c-marker.is-color-team-red .c-marker-body {
  background: var(--color-team-red);
}
.c-marker.is-color-team-blue .c-marker-body {
  background: var(--color-team-blue);
}
.c-marker.is-color-team-green .c-marker-body {
  background: var(--color-team-green);
}
.c-marker.is-color-team-purple .c-marker-body {
  background: var(--color-team-purple);
}
.c-marker.is-color-marker-objective .c-marker-body {
  background: var(--color-marker-objective);
}
.c-marker.is-color-marker-spawn .c-marker-body {
  background: var(--color-marker-spawn);
}
.c-marker.is-color-marker-danger .c-marker-body {
  background: var(--color-marker-danger);
}
.c-marker.is-color-marker-cover .c-marker-body {
  background: var(--color-marker-cover);
}

/* Sélection — l'outline reste rectangulaire pour les 4 formes
   (CSS outline ne suit pas clip-path/transform). Trade-off accepté
   pour cette itération. */
.c-marker.is-selected .c-marker-body {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Icône */
.c-marker-icon {
  width: 16px;
  height: 16px;
  color: var(--color-fg-primary);
}

/* Label HUD */
.c-marker-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  background: var(--color-surface-elevated);
  color: var(--color-fg-primary);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 2px 6px;
  white-space: nowrap;
  border: 1px solid var(--color-line-default);
  pointer-events: none;
}

/* Place mode cursor (appliqué sur #map) */
.leaflet-container.is-placing,
.leaflet-container.is-placing .leaflet-grab,
.leaflet-container.is-placing .leaflet-interactive {
  cursor: crosshair !important;
}
```

The `.leaflet-container.is-placing` selector targets the Leaflet root. The `!important` is necessary because Leaflet sets `cursor: grab` on the same element via inline JS.

- [ ] **Step 2: Read current `src/styles/global.css`**

Use the Read tool to get its current content (it should have ~11 lines: 1 tailwindcss import, 1 tokens import, 2 fontsource imports, 1 primitives import, 3 component imports). Then update.

- [ ] **Step 3: Append the marker.css import**

In `src/styles/global.css`, after the existing `@import "./components/pin.css";` line, add:

```css
@import './components/marker.css';
```

The full `global.css` now reads:

```css
@import 'tailwindcss';
@import './tokens.css';

@import '@fontsource-variable/inter';
@import '@fontsource-variable/jetbrains-mono';

@import './primitives.css';

@import './components/corner-brackets.css';
@import './components/grid-overlay.css';
@import './components/pin.css';
@import './components/marker.css';
```

- [ ] **Step 4: Verify build picks up the marker CSS**

Run:

```bash
npm run build
grep -c "c-marker" dist/_astro/*.css
```

Expected: build succeeds. The grep returns at least one line with a count > 0 (CSS rules from marker.css are bundled).

- [ ] **Step 5: Commit (one commit, both files)**

```bash
git add src/styles/components/marker.css src/styles/global.css
git commit -m "feat(markers): add .c-marker BEM stylesheet + wire in global.css

Body 32×32 with 4 shape variants (square/circle/triangle/diamond
via clip-path or transform), 8 color modifiers from design tokens,
selection outline (rectangular for all shapes — clip-path doesn't
clip outline, accepted trade-off), HUD-style label below the body,
and a .leaflet-container.is-placing rule that swaps the cursor to
crosshair while in place mode."
```

---

### Task 5: Add §I Markers section to `/styleguide`

**Files:** Modify `src/pages/styleguide.astro`

Permanent visual reference for the marker variants (plus validates that the CSS from Task 4 actually renders correctly without needing the full feature wired). Lives alongside §A–§H.

- [ ] **Step 1: Read the file to find the insertion point**

Use the Read tool on `src/pages/styleguide.astro`. Find the closing `</section>` of "H. Effets HUD" (the last section). The new §I goes just after that closing tag, before `</main>`.

- [ ] **Step 2: Add `MARKER_SHAPES`, `MARKER_COLORS`, `MARKER_ICONS` and `buildIconSvg` imports to the frontmatter**

In the frontmatter (after the existing component imports), add:

```ts
import { MARKER_SHAPES, MARKER_COLORS, MARKER_ICONS } from '../data/markers';
import { buildIconSvg } from '../data/marker-icons';
```

- [ ] **Step 3: Insert the §I section**

After the closing `</section>` of "H. Effets HUD", insert:

```astro
<section class="border-t border-line-subtle py-10" aria-labelledby="sec-markers">
  <h2 id="sec-markers" class="mb-6 text-xl font-semibold">I. Markers d'annotation</h2>

  <div class="grid gap-6">
    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Formes (square · triangle · circle · diamond)
      </span>
      <div class="flex flex-wrap items-center gap-8 py-4">
        {
          MARKER_SHAPES.map((shape) => (
            <div class:list={["c-marker", `is-shape-${shape}`, "is-color-team-blue"]} aria-hidden="true">
              <div class="c-marker-body">
                <span class="c-marker-text">{shape.charAt(0).toUpperCase()}</span>
              </div>
            </div>
          ))
        }
      </div>
    </Card>

    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Couleurs (4 teams + 4 markers)
      </span>
      <div class="flex flex-wrap items-center gap-6 py-4">
        {
          MARKER_COLORS.map((color) => (
            <div class:list={["c-marker", "is-shape-square", `is-color-${color}`]} aria-hidden="true">
              <div class="c-marker-body" />
            </div>
          ))
        }
      </div>
    </Card>

    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Contenus : texte / icône / aucun
      </span>
      <div class="flex flex-wrap items-center gap-6 py-4">
        <div class="c-marker is-shape-square is-color-team-red" aria-hidden="true">
          <div class="c-marker-body" />
        </div>
        <div class="c-marker is-shape-square is-color-team-red" aria-hidden="true">
          <div class="c-marker-body"><span class="c-marker-text">LZ</span></div>
        </div>
        {
          MARKER_ICONS.map((icon) => (
            <div class="c-marker is-shape-square is-color-team-red" aria-hidden="true">
              <div class="c-marker-body" set:html={buildIconSvg(icon)} />
            </div>
          ))
        }
      </div>
    </Card>

    <Card>
      <span slot="header" class="font-mono text-xs tracking-wider text-fg-secondary uppercase">
        Avec label HUD + état sélectionné
      </span>
      <div class="flex flex-wrap items-end gap-12 py-8">
        <div class="c-marker is-shape-square is-color-marker-spawn" aria-hidden="true">
          <div class="c-marker-body"><span class="c-marker-text">S1</span></div>
          <div class="c-marker-label">Spawn Alpha</div>
        </div>
        <div class="c-marker is-shape-circle is-color-marker-objective is-selected" aria-hidden="true">
          <div class="c-marker-body" set:html={`<span>1</span>`} />
          <div class="c-marker-label">Objectif</div>
        </div>
        <div class="c-marker is-shape-diamond is-color-marker-danger" aria-hidden="true">
          <div class="c-marker-body" set:html={buildIconSvg("alert-triangle")} />
          <div class="c-marker-label">Hot zone</div>
        </div>
      </div>
    </Card>
  </div>
</section>
```

The `set:html` is Astro's official directive for inserting raw HTML strings. Used for icon SVGs (which come from `buildIconSvg`).

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds, 2 pages still generated.

- [ ] **Step 5: Commit**

```bash
git add src/pages/styleguide.astro
git commit -m "feat(styleguide): add §I Markers — visual reference for all variants

Iterates MARKER_SHAPES / MARKER_COLORS / MARKER_ICONS to render every
variant. Includes an 'avec label HUD' card with 3 example markers
(spawn / objective / danger) — one selected to show the outline state."
```

---

## Phase 3 — Map integration

### Task 6: Map.astro — emit `map:ready` event

**Files:** Modify `src/components/Map.astro`

After `L.map(...)` is instantiated, dispatch a `map:ready` CustomEvent so MarkerLayer (and any future map-aware component) can grab the map reference.

- [ ] **Step 1: Read `src/components/Map.astro` to find the right insertion point**

The relevant block is around the `if (container) { const map = L.map(container); ... }` section. We want to dispatch `map:ready` immediately after `const map = L.map(container);`.

- [ ] **Step 2: Add the dispatch**

Find:

```ts
  const container = document.getElementById("map");
  if (container) {
    const map = L.map(container);

    const buildLayers = (id: MapStyleId): L.TileLayer[] => {
```

Replace with:

```ts
  const container = document.getElementById("map");
  if (container) {
    const map = L.map(container);

    window.dispatchEvent(
      new CustomEvent<{ map: L.Map; container: HTMLElement }>("map:ready", {
        detail: { map, container },
      }),
    );

    const buildLayers = (id: MapStyleId): L.TileLayer[] => {
```

The `container` is also exposed (MarkerLayer / future code may want to apply classes on it for cursor management — see Task 9).

- [ ] **Step 3: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds, 2 pages.

- [ ] **Step 4: Commit**

```bash
git add src/components/Map.astro
git commit -m "feat(map): emit map:ready CustomEvent on init

Exposes the L.Map instance + #map container element to any other
component that needs to attach behavior. Cohérent with the existing
map:fly event pattern; consumed by MarkerLayer (next task)."
```

---

### Task 7: `MarkerLayer.astro` — diff-based render of store markers

**Files:**

- Create: `src/components/MarkerLayer.astro`
- Modify: `src/pages/index.astro`

This component has no visible markup of its own — it's a pure script that listens to `map:ready` then to the markers store, and synchronizes a `L.layerGroup` with the store's marker list.

- [ ] **Step 1: Create `src/components/MarkerLayer.astro`**

```astro
---
// MarkerLayer is a side-effect component: it has no DOM of its own.
// It listens to map:ready, builds a Leaflet layer group, then
// subscribes to the markers store and syncs the layer group with the
// store state via a diff-based update.
---

<script>
  import L from "leaflet";
  import {
    subscribe,
    getState,
    selectMarker,
    moveSelected,
  } from "../lib/markers-store";
  import type { Marker } from "../data/markers";
  import { buildIconSvg } from "../data/marker-icons";

  type MapReadyDetail = { map: L.Map; container: HTMLElement };

  function buildMarkerHtml(m: Marker, isSelected: boolean): string {
    const classes = [
      "c-marker",
      `is-shape-${m.shape}`,
      `is-color-${m.color}`,
      isSelected ? "is-selected" : "",
    ]
      .filter(Boolean)
      .join(" ");

    let bodyContent = "";
    if (m.content.kind === "text") {
      const safe = m.content.value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      bodyContent = `<span class="c-marker-text">${safe}</span>`;
    } else if (m.content.kind === "icon") {
      bodyContent = buildIconSvg(m.content.value);
    }

    const label = m.label?.trim()
      ? `<div class="c-marker-label">${m.label
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</div>`
      : "";

    return `<div class="${classes}" data-id="${m.id}"><div class="c-marker-body">${bodyContent}</div>${label}</div>`;
  }

  function buildIcon(m: Marker, isSelected: boolean): L.DivIcon {
    return L.divIcon({
      html: buildMarkerHtml(m, isSelected),
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  window.addEventListener("map:ready", (event) => {
    const { map } = (event as CustomEvent<MapReadyDetail>).detail;
    const group = L.layerGroup().addTo(map);
    const layerById = new Map<string, L.Marker>();

    function attachHandlers(id: string, leafletMarker: L.Marker): void {
      leafletMarker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selectMarker(id);
      });
      leafletMarker.on("dragstart", () => {
        selectMarker(id);
      });
      leafletMarker.on("dragend", (e) => {
        const target = e.target as L.Marker;
        const ll = target.getLatLng();
        moveSelected(ll.lat, ll.lng);
      });
    }

    function sync(): void {
      const state = getState();
      const desiredIds = new Set(state.markers.map((m) => m.id));

      // Remove markers no longer in state
      for (const [id, lm] of layerById) {
        if (!desiredIds.has(id)) {
          group.removeLayer(lm);
          layerById.delete(id);
        }
      }

      // Add or update remaining markers
      for (const m of state.markers) {
        const isSelected = state.selectedId === m.id;
        const existing = layerById.get(m.id);
        if (!existing) {
          const lm = L.marker([m.lat, m.lng], {
            icon: buildIcon(m, isSelected),
            draggable: true,
          });
          attachHandlers(m.id, lm);
          group.addLayer(lm);
          layerById.set(m.id, lm);
        } else {
          // Update lat/lng if changed
          const ll = existing.getLatLng();
          if (ll.lat !== m.lat || ll.lng !== m.lng) {
            existing.setLatLng([m.lat, m.lng]);
          }
          // Replace icon (covers shape/color/content/label/selection changes)
          existing.setIcon(buildIcon(m, isSelected));
        }
      }
    }

    sync();
    subscribe(sync);
  });
</script>
```

The HTML escape is minimal but covers the realistic cases (`<`, `>`, `&`). Since the user types into a 0-3 char text field and a label field, full HTML escaping isn't strictly necessary, but defending against `<` is cheap.

- [ ] **Step 2: Render `<MarkerLayer />` in `index.astro`**

Read `src/pages/index.astro`. The body should look like:

```astro
<body class="flex h-dvh overflow-hidden bg-surface-base text-fg-primary">
  <Sidebar />
  <PanelGroup />
  <main class="c-corner-brackets relative flex-1">
    <span class="c-corner-brackets-bl" aria-hidden="true"></span>
    <span class="c-corner-brackets-br" aria-hidden="true"></span>
    <Map />
  </main>
</body>
```

Add the import in the frontmatter:

```astro
import MarkerLayer from "../components/MarkerLayer.astro";
```

And add `<MarkerLayer />` immediately after `<Map />` inside the `<main>`:

```astro
<main class="c-corner-brackets relative flex-1">
  <span class="c-corner-brackets-bl" aria-hidden="true"></span>
  <span class="c-corner-brackets-br" aria-hidden="true"></span>
  <Map />
  <MarkerLayer />
</main>
```

The placement is irrelevant DOM-wise (MarkerLayer renders nothing), but co-locating it with `<Map />` documents the relationship.

- [ ] **Step 3: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds, 2 pages.

- [ ] **Step 4: Smoke test in dev**

Run:

```bash
npm run dev
```

Then in the browser at `http://localhost:4321/`, open devtools console and run:

```js
const store = await import('/src/lib/markers-store.ts');
store.createMarker(48.8566, 2.3522, {
  shape: 'square',
  color: 'team-red',
  content: { kind: 'text', value: 'PA' },
  label: 'Paris',
});
```

Expected: a red square marker with "PA" inside and "PARIS" label appears at Paris on the map. (If the import path with `.ts` doesn't work in dev, try `/src/lib/markers-store.ts?direct` or adjust per Astro/Vite's HMR resolver.)

If the smoke test fails due to import path issues, the implementation is still correct — the smoke test is just a convenience. Skip and move on.

- [ ] **Step 5: Commit**

```bash
git add src/components/MarkerLayer.astro src/pages/index.astro
git commit -m "feat(markers): add MarkerLayer — diff-based Leaflet sync

Listens to map:ready, then subscribes to the markers store. On every
state change, diffs by id: adds new L.markers, removes deleted,
updates lat/lng + icon (which covers shape/color/content/label/
selection changes). Click selects, dragstart selects, dragend moves.
HTML escape on user-provided text content + label."
```

---

## Phase 4 — Editor panel UI

### Task 8: `MarkerEditor.astro` skeleton — wired into PanelGroup, idle state

**Files:**

- Modify: `src/components/ui/Button.astro` (small attr-forwarding fix)
- Create: `src/components/MarkerEditor.astro`
- Modify: `src/components/PanelGroup.astro`

This task wires the empty Outils panel to the editor and gets the "+ Ajouter un marqueur" button rendering. No place mode logic yet — just the idle state.

#### Pre-step: extend `Button.astro` to forward unknown HTML attributes

The current `Button.astro` only destructures a fixed set of props (`variant`, `size`, `type`, `href`, `disabled`, `class`, `aria-label`). Any other prop the consumer passes (like `data-action`, `id`, custom `aria-*`, etc.) is silently dropped. We need `data-action` selectors in MarkerEditor, so let's fix the component once and for all to spread additional attributes onto the rendered `<button>` / `<a>`.

- [ ] **Step 0: Update `src/components/ui/Button.astro`**

Read the current file first, then replace its content with:

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
  [key: `data-${string}`]: string | number | boolean | undefined;
}

const {
  variant = "primary",
  size = "md",
  type = "button",
  href,
  disabled,
  class: extraClass,
  "aria-label": ariaLabel,
  ...rest
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
    <a class={classes} href={href} aria-label={ariaLabel} {...rest}>
      <slot />
    </a>
  ) : (
    <button class={classes} type={type} disabled={disabled} aria-label={ariaLabel} {...rest}>
      <slot />
    </button>
  )
}
```

Two changes:

- The `Props` interface now permits arbitrary `data-*` attributes via the index signature `[key: `data-${string}`]: ...`. Other unknown attrs (`id`, custom `aria-*`) won't be type-checked but will still be spread at runtime.
- `...rest` captures everything not destructured and `{...rest}` spreads it onto the rendered element.

Verify the existing styleguide still builds and renders correctly afterward — `npm run build` should succeed.

- [ ] **Step 1: Create `src/components/MarkerEditor.astro`**

```astro
---
import Button from "./ui/Button.astro";
---

<div data-marker-editor>
  <div data-marker-editor-idle>
    <Button variant="primary" size="md" class="w-full" data-action="start-placing">
      + Ajouter un marqueur
    </Button>
  </div>
</div>

<script>
  import { setMode, subscribe, getState } from "../lib/markers-store";

  const root = document.querySelector<HTMLElement>("[data-marker-editor]");
  const idle = root?.querySelector<HTMLElement>("[data-marker-editor-idle]");
  const startBtn = root?.querySelector<HTMLButtonElement>(
    'button[data-action="start-placing"]',
  );

  startBtn?.addEventListener("click", () => {
    setMode("placing");
  });

  function render(): void {
    if (!idle) return;
    const state = getState();
    const showIdle = state.mode === "idle" && state.selectedId === null;
    idle.hidden = !showIdle;
  }

  render();
  subscribe(render);
</script>
```

For now, when not idle, `idle` is hidden and nothing else is rendered yet. Subsequent tasks (9, 10, 11) will add the placing/selected form below.

- [ ] **Step 2: Modify `PanelGroup.astro` to render `<MarkerEditor />` inside the tools panel**

Read `src/components/PanelGroup.astro`. Find the `panels.map` block. The current code only renders content for `panel.id === "address"` and `panel.id === "settings"`. Add a branch for `tools`.

In the frontmatter, add the import:

```ts
import MarkerEditor from './MarkerEditor.astro';
```

In the template, after the existing `{panel.id === "address" && <AddressSearch />}` (or wherever it sits), add:

```astro
{panel.id === "tools" && <MarkerEditor />}
```

Place it between `address` and `settings` to keep the alphabetical/UI order consistent.

- [ ] **Step 3: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds, 2 pages. The Outils tab in the rendered HTML should now contain the "+ Ajouter un marqueur" button.

- [ ] **Step 4: Smoke test**

Open `http://localhost:4321/`, click the wrench (Outils) tab in the sidebar. Expected: title "Outils" + a yellow "+ Ajouter un marqueur" button below.

- [ ] **Step 5: Commit (TWO commits — keep the Button change separate)**

First, the Button extension on its own:

```bash
git add src/components/ui/Button.astro
git commit -m "feat(ui): forward unknown HTML attributes from Button

Adds a [data-*] index signature to Props and spreads ...rest onto
the rendered <button>/<a>. Lets consumers attach data-action, id,
custom aria-* without modifying the component for each new use."
```

Then the MarkerEditor + PanelGroup changes:

```bash
git add src/components/MarkerEditor.astro src/components/PanelGroup.astro
git commit -m "feat(markers): add MarkerEditor panel + idle-state button

Rendered inside the Tools panel of PanelGroup. For now only the
idle state shows: a primary 'Ajouter un marqueur' button that calls
setMode('placing'). The form for placing/selected states comes in
the next tasks."
```

---

### Task 9: Place mode wiring — Map.astro intercepts click + cursor + creation

**Files:** Modify `src/components/Map.astro`

When the store mode is `placing`:

- The `#map` Leaflet container gets a `is-placing` class (CSS already provides crosshair cursor — Task 4).
- The next `click` on the map triggers `createMarker(lat, lng, draft)`. The store will set `mode` back to `idle` automatically (`createMarker` does this internally — see Task 3).

- [ ] **Step 1: Modify the `<script>` in `Map.astro`**

Add the imports and the place-mode handler. Find the script's existing imports near the top:

```ts
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mapStyles, defaultMapStyle, type MapStyleId } from '../data/map-styles';
```

Add below them:

```ts
import {
  subscribe as subscribeMarkers,
  getState as getMarkersState,
  createMarker,
} from '../lib/markers-store';
```

Then, find the `if (container) { const map = L.map(container); ...` block. After all the existing handlers (radio change, ResizeObserver, map:fly listener), and before the final `}` that closes the `if (container)` block, add:

```ts
// --- Place mode ---
function applyPlacingClass(): void {
  const { mode } = getMarkersState();
  container!.classList.toggle('is-placing', mode === 'placing');
}
applyPlacingClass();
subscribeMarkers(applyPlacingClass);

map.on('click', (e) => {
  const { mode, draft } = getMarkersState();
  if (mode !== 'placing') return;
  createMarker(e.latlng.lat, e.latlng.lng, draft);
});
```

The non-null assertion on `container!` is justified because we're inside the `if (container)` block.

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds, 2 pages.

- [ ] **Step 3: Smoke test**

Open `http://localhost:4321/`. Click the Outils tab. Click "+ Ajouter un marqueur".

Expected behaviors:

- Cursor over the map turns to a crosshair.
- Click anywhere on the map. A red square marker appears at the clicked position with no content / no label (default draft).
- The cursor returns to the default Leaflet `grab`.
- The button "+ Ajouter un marqueur" disappears (because the store now has `selectedId !== null` from `createMarker` auto-selecting).

If clicking the map doesn't drop a marker, the `is-placing` class isn't being applied or the click handler isn't wired — check the console for errors, recheck the script position.

- [ ] **Step 4: Commit**

```bash
git add src/components/Map.astro
git commit -m "feat(markers): wire place mode in Map.astro

When markers store mode === 'placing', toggle .is-placing class on
the #map container (CSS swaps cursor → crosshair) and the next
Leaflet click event creates a marker at e.latlng using the current
draft. createMarker() flips mode back to idle and selects the new
marker; subsequent clicks on the map don't accidentally re-trigger."
```

---

### Task 10: Editor form — Shape selector + Color swatches + Label input

**Files:** Modify `src/components/MarkerEditor.astro`

This task adds the form rendering for the placing/selected state — minus the Content controls (those are Task 11). Doing them in two tasks keeps each manageable.

- [ ] **Step 1: Replace the entire `MarkerEditor.astro` file**

```astro
---
import Button from "./ui/Button.astro";
import {
  MARKER_SHAPES,
  MARKER_COLORS,
  type MarkerShape,
  type MarkerColor,
} from "../data/markers";

const shapeLabels: Record<MarkerShape, string> = {
  square: "Carré",
  triangle: "Triangle",
  circle: "Cercle",
  diamond: "Losange",
};
---

<div data-marker-editor>
  <div data-marker-editor-idle>
    <Button variant="primary" size="md" class="w-full" data-action="start-placing">
      + Ajouter un marqueur
    </Button>
  </div>

  <div data-marker-editor-form hidden class="flex flex-col gap-5">
    <div class="flex items-center justify-between">
      <span data-form-status class="font-mono text-xs tracking-wider text-fg-secondary uppercase"
      ></span>
      <Button variant="ghost" size="sm" data-action="cancel-or-deselect">
        ✕
      </Button>
    </div>

    <fieldset class="flex flex-col gap-2">
      <legend class="font-mono text-xs font-semibold tracking-wider text-fg-secondary uppercase">
        Forme
      </legend>
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
      <legend class="font-mono text-xs font-semibold tracking-wider text-fg-secondary uppercase">
        Couleur
      </legend>
      <div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Couleur du marqueur">
        {
          MARKER_COLORS.map((color) => (
            <button
              type="button"
              role="radio"
              aria-checked="false"
              data-field="color"
              data-value={color}
              aria-label={color}
              class:list={[
                "h-10 rounded-sm border border-line-default transition-colors aria-checked:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                `bg-${color}`,
              ]}
            />
          ))
        }
      </div>
    </fieldset>

    <div class="flex flex-col gap-2">
      <label
        for="marker-label"
        class="font-mono text-xs font-semibold tracking-wider text-fg-secondary uppercase"
      >
        Label (optionnel)
      </label>
      <input
        id="marker-label"
        type="text"
        data-field="label"
        maxlength="40"
        class="w-full rounded-sm border border-line-default bg-surface-base px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        placeholder="MIKE 4"
      />
    </div>
  </div>
</div>

<script>
  import {
    setMode,
    subscribe,
    getState,
    updateDraft,
    updateSelected,
    selectMarker,
  } from "../lib/markers-store";
  import type { MarkerColor, MarkerShape } from "../data/markers";

  const root = document.querySelector<HTMLElement>("[data-marker-editor]");
  if (!root) {
    // PanelGroup didn't render the editor on this page; bail.
  } else {
    const idle = root.querySelector<HTMLElement>("[data-marker-editor-idle]")!;
    const form = root.querySelector<HTMLElement>("[data-marker-editor-form]")!;
    const statusEl = root.querySelector<HTMLElement>("[data-form-status]")!;
    const startBtn = root.querySelector<HTMLButtonElement>(
      'button[data-action="start-placing"]',
    )!;
    const cancelBtn = root.querySelector<HTMLButtonElement>(
      'button[data-action="cancel-or-deselect"]',
    )!;
    const labelInput = root.querySelector<HTMLInputElement>(
      'input[data-field="label"]',
    )!;
    const shapeBtns = root.querySelectorAll<HTMLButtonElement>(
      'button[data-field="shape"]',
    );
    const colorBtns = root.querySelectorAll<HTMLButtonElement>(
      'button[data-field="color"]',
    );

    startBtn.addEventListener("click", () => setMode("placing"));

    cancelBtn.addEventListener("click", () => {
      const { mode, selectedId } = getState();
      if (mode === "placing") setMode("idle");
      else if (selectedId) selectMarker(null);
    });

    for (const btn of shapeBtns) {
      btn.addEventListener("click", () => {
        const value = btn.dataset.value as MarkerShape;
        const { selectedId } = getState();
        if (selectedId) updateSelected({ shape: value });
        else updateDraft({ shape: value });
      });
    }

    for (const btn of colorBtns) {
      btn.addEventListener("click", () => {
        const value = btn.dataset.value as MarkerColor;
        const { selectedId } = getState();
        if (selectedId) updateSelected({ color: value });
        else updateDraft({ color: value });
      });
    }

    labelInput.addEventListener("input", () => {
      const { selectedId } = getState();
      if (selectedId) updateSelected({ label: labelInput.value });
      else updateDraft({ label: labelInput.value });
    });

    function render(): void {
      const state = getState();
      const showIdle = state.mode === "idle" && state.selectedId === null;
      idle.hidden = !showIdle;
      form.hidden = showIdle;

      if (showIdle) return;

      // Read either the selected marker or the draft as the "source"
      const source = state.selectedId
        ? state.markers.find((m) => m.id === state.selectedId)
        : null;
      const data = source ?? state.draft;

      statusEl.textContent =
        state.mode === "placing"
          ? "Placement en cours…"
          : "Marqueur sélectionné";

      cancelBtn.setAttribute(
        "aria-label",
        state.mode === "placing" ? "Annuler le placement" : "Désélectionner",
      );

      // Reflect shape/color in the radio buttons
      for (const btn of shapeBtns) {
        btn.setAttribute("aria-checked", String(btn.dataset.value === data.shape));
      }
      for (const btn of colorBtns) {
        btn.setAttribute("aria-checked", String(btn.dataset.value === data.color));
      }

      // Reflect label
      const labelValue = data.label ?? "";
      if (labelInput.value !== labelValue) {
        labelInput.value = labelValue;
      }
    }

    render();
    subscribe(render);
  }
</script>
```

The class `bg-${color}` resolves at build time because `MARKER_COLORS` is iterated server-side (the `.astro` template runs at build time / SSG). Tailwind v4 will see all 8 `bg-team-red` … `bg-marker-cover` classes in the output HTML and generate the corresponding CSS rules.

The `aria-checked` attribute is updated at runtime when the store changes; Tailwind's `aria-checked:` variant picks it up.

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds, 2 pages.

- [ ] **Step 3: Smoke test**

Open `/`. Click Outils tab. Click "+ Ajouter un marqueur".

Expected:

- The form replaces the button.
- "PLACEMENT EN COURS…" caption + ✕ button.
- Form shows: 4 shape buttons (current shape highlighted in yellow border), 8 color swatches (current color highlighted), label input.
- Click a different shape — the highlight moves.
- Type in the label — the value persists in the field.
- Click on the map (in the actual map area, not the panel) — a marker drops with the chosen shape/color/label.
- Caption changes to "MARQUEUR SÉLECTIONNÉ", and now changing shape/color/label updates **the placed marker** in real time.
- Click ✕ — desellects, form hides, the "+ Ajouter" button reappears.

- [ ] **Step 4: Commit**

```bash
git add src/components/MarkerEditor.astro
git commit -m "feat(markers): add Shape + Color + Label form to editor

Three field groups inside the placing/selected form: shape (4 radio
buttons with mini marker previews), color (8 swatches as a 2×4
grid), label (text input). Field changes route to updateSelected
when a marker is selected, otherwise to updateDraft. Cancel/X
button leaves placing mode or deselects depending on context."
```

---

### Task 11: Editor form — Content radio + text input + icon picker

**Files:** Modify `src/components/MarkerEditor.astro`

Adds the Content section (Aucun / Texte / Icône with mutually-exclusive controls).

- [ ] **Step 1: Add the Content section to the form template**

In `src/components/MarkerEditor.astro`, find the existing `<fieldset>` for "Couleur". Just **after** the closing `</fieldset>` of that block (and **before** the `<div class="flex flex-col gap-2">` for Label), insert:

```astro
<fieldset class="flex flex-col gap-2">
  <legend class="font-mono text-xs font-semibold tracking-wider text-fg-secondary uppercase">
    Contenu
  </legend>
  <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Type de contenu">
    {
      (["none", "text", "icon"] as const).map((kind) => (
        <button
          type="button"
          role="radio"
          aria-checked="false"
          data-field="content-kind"
          data-value={kind}
          class="rounded-sm border border-line-default bg-transparent px-3 py-2 text-sm text-fg-secondary transition-colors hover:bg-surface-elevated hover:text-fg-primary aria-checked:border-accent aria-checked:bg-surface-elevated aria-checked:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {kind === "none" ? "Aucun" : kind === "text" ? "Texte" : "Icône"}
        </button>
      ))
    }
  </div>

  <div data-content-text class="flex flex-col gap-2" hidden>
    <input
      type="text"
      data-field="content-text"
      maxlength="3"
      class="w-full rounded-sm border border-line-default bg-surface-base px-3 py-2 text-sm text-fg-primary uppercase placeholder:text-fg-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      placeholder="LZ"
      aria-label="Contenu texte (1 à 3 caractères)"
    />
  </div>

  <div data-content-icon class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Choix d'icône" hidden>
    {/* Filled at runtime — see script */}
  </div>
</fieldset>
```

- [ ] **Step 2: Add the icon picker imports + render**

In the frontmatter, add to existing imports:

```ts
import { MARKER_ICONS } from '../data/markers';
import { buildIconSvg } from '../data/marker-icons';
```

Still in the frontmatter, define `iconPickerHtml` so the script can inject it (Astro doesn't run scripts at SSG, so we need to render the icon buttons either in the template or via a server-time string we pass to the script).

The simpler approach: render the icon buttons directly in the template. Replace the `data-content-icon` div above with:

```astro
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
```

Note `set:html={buildIconSvg(icon, "size-5")}` — passing `"size-5"` as the className overrides the default `c-marker-icon` (which would be 16×16) with Tailwind's `size-5` (20×20) for better visibility in the picker.

- [ ] **Step 3: Update the script to handle content controls**

Inside the `<script>` block, **after** the existing element queries (`shapeBtns`, `colorBtns`), add:

```ts
const contentKindBtns = root.querySelectorAll<HTMLButtonElement>(
  'button[data-field="content-kind"]',
);
const contentTextWrap = root.querySelector<HTMLElement>('[data-content-text]')!;
const contentIconWrap = root.querySelector<HTMLElement>('[data-content-icon]')!;
const contentTextInput = root.querySelector<HTMLInputElement>('input[data-field="content-text"]')!;
const contentIconBtns = root.querySelectorAll<HTMLButtonElement>(
  'button[data-field="content-icon"]',
);
```

Then add the import for `MarkerContent` and `MarkerIconId` at the top of the script:

```ts
import type { MarkerColor, MarkerContent, MarkerIconId, MarkerShape } from '../data/markers';
```

Add the event handlers (after the existing color button loop, before the label input listener):

```ts
for (const btn of contentKindBtns) {
  btn.addEventListener('click', () => {
    const kind = btn.dataset.value as MarkerContent['kind'];
    let content: MarkerContent;
    const { selectedId, draft, markers } = getState();
    const source = selectedId ? markers.find((m) => m.id === selectedId) : draft;
    if (kind === 'none') {
      content = { kind: 'none' };
    } else if (kind === 'text') {
      const value = source && source.content.kind === 'text' ? source.content.value : '';
      content = { kind: 'text', value };
    } else {
      const value = source && source.content.kind === 'icon' ? source.content.value : 'flag';
      content = { kind: 'icon', value };
    }
    if (selectedId) updateSelected({ content });
    else updateDraft({ content });
  });
}

contentTextInput.addEventListener('input', () => {
  const value = contentTextInput.value.slice(0, 3);
  const content: MarkerContent = { kind: 'text', value };
  const { selectedId } = getState();
  if (selectedId) updateSelected({ content });
  else updateDraft({ content });
});

for (const btn of contentIconBtns) {
  btn.addEventListener('click', () => {
    const value = btn.dataset.value as MarkerIconId;
    const content: MarkerContent = { kind: 'icon', value };
    const { selectedId } = getState();
    if (selectedId) updateSelected({ content });
    else updateDraft({ content });
  });
}
```

Update the `render()` function to also reflect the content state. Inside `render()`, **before** the closing `}`, add:

```ts
// Reflect content kind + sub-controls
const kind = data.content.kind;
for (const btn of contentKindBtns) {
  btn.setAttribute('aria-checked', String(btn.dataset.value === kind));
}
contentTextWrap.hidden = kind !== 'text';
contentIconWrap.hidden = kind !== 'icon';

if (kind === 'text') {
  if (contentTextInput.value !== data.content.value) {
    contentTextInput.value = data.content.value;
  }
}
if (kind === 'icon') {
  for (const btn of contentIconBtns) {
    btn.setAttribute('aria-checked', String(btn.dataset.value === data.content.value));
  }
}
```

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds, 2 pages.

- [ ] **Step 5: Smoke test**

Open `/` → Outils → "+ Ajouter un marqueur". Try each content kind:

- **Aucun** : no text input, no icon picker visible. Place a marker → empty body.
- **Texte** : text input visible. Type "LZ" → marker shows LZ (after place + select, or in real-time when editing existing).
- **Icône** : icon picker visible (8 icons in a 2×4 grid). Click `flag` → marker shows the flag SVG. Switch to `target` → marker icon swaps.

Switching content kinds while a marker is selected should update its rendering live.

- [ ] **Step 6: Commit**

```bash
git add src/components/MarkerEditor.astro
git commit -m "feat(markers): add Content section (none/text/icon) to editor

Three radio toggles for content kind. Text input (max 3 chars,
uppercase placeholder) shown for 'Texte'. 8-icon picker (2×4 grid
of Lucide icons) shown for 'Icône'. Switching kinds preserves the
text/icon value when possible (so cycling Texte→Aucun→Texte keeps
your typed value)."
```

---

## Phase 5 — Map interactions

### Task 12: Click marker → select + sync editor

**Files:** none new. Click selection is **already wired** by Task 7 (`leafletMarker.on("click", e => { L.DomEvent.stopPropagation(e); selectMarker(id); })`) AND by the editor's `render()` which reflects the selected marker's data into the form (Tasks 10, 11).

This task verifies the integration end-to-end and adds the **deselect-on-map-background-click** handler in Map.astro (idle mode only).

- [ ] **Step 1: Add the deselect handler in Map.astro**

In `src/components/Map.astro`, find the place-mode click handler added in Task 9:

```ts
map.on('click', (e) => {
  const { mode, draft } = getMarkersState();
  if (mode !== 'placing') return;
  createMarker(e.latlng.lat, e.latlng.lng, draft);
});
```

Replace with:

```ts
map.on('click', (e) => {
  const state = getMarkersState();
  if (state.mode === 'placing') {
    createMarker(e.latlng.lat, e.latlng.lng, state.draft);
    return;
  }
  if (state.selectedId !== null) {
    selectMarker(null);
  }
});
```

Add the `selectMarker` import:

```ts
import {
  subscribe as subscribeMarkers,
  getState as getMarkersState,
  createMarker,
  selectMarker,
} from '../lib/markers-store';
```

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Smoke test — multi-marker selection swap**

Open `/`. Place two markers with different colors via place mode. After placing the second, click the **first** marker on the map.

Expected:

- The first marker's outline turns yellow (selected).
- The form in the Outils panel updates to reflect the **first** marker's shape / color / content / label.
- Click on the map background. The first marker deselects, form returns to idle ("+ Ajouter…" button visible).

- [ ] **Step 4: Commit**

```bash
git add src/components/Map.astro
git commit -m "feat(markers): deselect on map background click (idle mode)

When the user clicks the map background while a marker is selected
(and not in place mode), call selectMarker(null) so the form returns
to idle. Marker click handlers stop propagation, so clicking ON a
marker doesn't trigger the deselect."
```

---

### Task 13: Drag marker to reposition

**Files:** none new. Drag is **already wired** by Task 7 (`L.marker(..., { draggable: true })` + `dragstart`/`dragend` handlers calling `selectMarker` and `moveSelected`).

This task verifies and adds nothing — but we keep it as a checkpoint to validate manually before moving on. **No commit if no code changes.**

- [ ] **Step 1: Smoke test — drag a marker**

Open `/`. Place a marker. Click and hold on it, drag to a new position, release.

Expected:

- During drag: the marker follows the cursor.
- On release: the marker stays at the new position.
- The marker is still selected (its outline is yellow).
- If you select another marker first, then drag a non-selected marker, the dragged marker becomes selected (per the `dragstart → selectMarker(id)` rule).

If drag doesn't work:

- Check `L.marker(..., { draggable: true })` is set (Task 7 step 1, around `L.marker([m.lat, m.lng], { icon: ..., draggable: true })`).
- Check `e.target.getLatLng()` returns the new latlng (Leaflet sets it during drag).

- [ ] **Step 2: No commit (no code changed)**

If smoke test passed, this task is complete. Move on. If it failed, fix the Task 7 code and amend that commit (or add a fix-up commit).

---

### Task 14: Delete button

**Files:** Modify `src/components/MarkerEditor.astro`

Add a "Supprimer ce marqueur" button at the bottom of the form, visible only when `selectedId !== null`.

- [ ] **Step 1: Add the delete button to the template**

In `src/components/MarkerEditor.astro`, find the last `<div>` of the form (the Label input wrapper). After it, just before the closing `</div>` of `[data-marker-editor-form]`, add:

```astro
<div data-delete-wrap hidden class="border-t border-line-subtle pt-4">
  <Button variant="ghost" size="sm" class="w-full text-danger hover:bg-surface-elevated" data-action="delete">
    Supprimer ce marqueur
  </Button>
</div>
```

The button uses the existing `ghost` variant — to color the text in danger red, we add the `text-danger` utility (which Tailwind generates because `--color-danger` is in `@theme`). The hover background still goes through the ghost variant's `hover:bg-surface-elevated`.

- [ ] **Step 2: Add the script handler**

In the `<script>` block, after the existing element queries, add:

```ts
const deleteWrap = root.querySelector<HTMLElement>('[data-delete-wrap]')!;
const deleteBtn = root.querySelector<HTMLButtonElement>('button[data-action="delete"]')!;
```

Add the import:

```ts
import {
  setMode,
  subscribe,
  getState,
  updateDraft,
  updateSelected,
  selectMarker,
  deleteSelected,
} from '../lib/markers-store';
```

(`deleteSelected` is the new addition.)

Add the click handler (anywhere in the script after the queries):

```ts
deleteBtn.addEventListener('click', () => {
  deleteSelected();
});
```

In the `render()` function, control the visibility. Find the existing show-idle / show-form logic and add:

```ts
deleteWrap.hidden = !state.selectedId;
```

Place this line right after `form.hidden = showIdle;`.

- [ ] **Step 3: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Smoke test**

Place a marker. Click "Supprimer ce marqueur".

Expected:

- The marker disappears from the map.
- The form returns to idle (the "+ Ajouter…" button is back).
- The "Supprimer" button is hidden whenever no marker is selected (i.e., during placing-mode-with-no-selection-yet, or after delete).

- [ ] **Step 5: Commit**

```bash
git add src/components/MarkerEditor.astro
git commit -m "feat(markers): add Supprimer ce marqueur button

Ghost button at the bottom of the form, red text via text-danger
utility, separated by a border-line-subtle divider. Visible only
when selectedId !== null. Calls deleteSelected() which removes the
marker and clears the selection (the form returns to idle)."
```

---

## Phase 6 — Polish

### Task 15: Escape key + final a11y check

**Files:**

- Modify: `src/components/MarkerEditor.astro` (one line)
- (No other code changes; final task is mostly a checklist)

- [ ] **Step 1: Add a global Escape listener in the editor's script**

In the `<script>` block of `src/components/MarkerEditor.astro`, after the existing event listeners, add:

```ts
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  // Don't swallow Escape if the user is inside a real input (let them clear it natively)
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    return;
  }
  const { mode, selectedId } = getState();
  if (mode === 'placing') {
    setMode('idle');
  } else if (selectedId) {
    selectMarker(null);
  }
});
```

The "input/textarea" guard keeps Escape's default behavior intact when the focus is in the label or content-text input.

- [ ] **Step 2: Final a11y manual checklist**

Run `npm run dev` and walk through:

- [ ] **Tab order** in the Outils panel: ✕ → shape buttons → color swatches → content kind buttons → (text input or icon buttons) → label input → delete button.
- [ ] All focusable elements show the **yellow `outline-accent`** focus ring.
- [ ] Shape and color radio groups: pressing Space activates the focused radio (browsers do this for `role="radio"` automatically when used inside `role="radiogroup"`).
- [ ] Markers placed in the dom have `aria-hidden="true"` on internal decorative spans (the marker SVG and label are decorative; the marker itself is interactive via Leaflet's click/drag, not via tab order — Leaflet markers aren't keyboard-accessible by default and that's an accepted limitation for this iteration).
- [ ] **Reduced motion:** in devtools → Rendering → Emulate prefers-reduced-motion → reduce. Place a marker. The Leaflet animation (slight zoom/pan if any) should be subdued. The marker creation itself has no CSS animation, so this is mostly a smoke test.
- [ ] Press **Escape** while in placing mode → exits to idle.
- [ ] Press Escape while a marker is selected → deselects.
- [ ] Press Escape while focus is in the label input → clears nothing in the store (native input behavior).

- [ ] **Step 3: Verify no legacy palette leaked into new files**

Run:

```bash
grep -rnE '(^|[^a-z-])(slate-|emerald-)|text-white|bg-white' src/components/MarkerEditor.astro src/components/MarkerLayer.astro src/styles/components/marker.css src/data/markers.ts src/data/marker-icons.ts src/lib/markers-store.ts src/pages/styleguide.astro
```

Expected: empty (no matches in the new files).

- [ ] **Step 4: Final build**

Run:

```bash
npm run build
```

Expected: build succeeds, 2 pages, no warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/MarkerEditor.astro
git commit -m "feat(markers): add Escape key handling + a11y polish pass

Escape exits placing mode or deselects, but doesn't fire when focus
is inside an input/textarea (so the native clearing behavior in the
label and content-text fields is preserved). All form controls have
yellow focus rings, marker decoration is aria-hidden, no legacy
palette classes."
```

---

## Done — final checklist

Before declaring the feature complete:

- [ ] `npm run build` succeeds — 2 pages, no warnings.
- [ ] `/styleguide` §I shows the marker variants (validates CSS).
- [ ] `/` shows the editor button + lets the user place, select, edit, drag, delete markers.
- [ ] `git log --oneline c2d7f84..HEAD` (or whatever the base SHA is at start of this work) shows ~14 atomic commits across the phases.
- [ ] No legacy `slate-` / `emerald-` / `text-white` / `bg-white` in new files.
- [ ] All interactive form controls show yellow focus rings on Tab.

Plan terminé.
