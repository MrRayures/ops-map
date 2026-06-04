# Persistance localStorage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the operation title and map view to `localStorage` (auto-save + manual save), with JSON file export/import via the sidebar.

**Architecture:** A single versioned blob under the `ops-map:state` key, written/read through a new agnostic module `src/lib/storage.ts`. Boot coordination between `index.astro` and `Map.astro` uses a global flag (`window.__opsMapBoot`) plus an `ops-map:boot` event. UI exposes three buttons in the sidebar: Sauvegarder / Exporter / Importer, with a minimal toast for feedback.

**Tech Stack:** Astro 6, TypeScript strict, Leaflet 1.9, Tailwind 4. No test runner is configured — verification is manual (`npm run dev` + browser) plus type checking with `npx astro check`.

**Spec:** [docs/superpowers/specs/2026-04-27-persistence-localstorage-design.md](../specs/2026-04-27-persistence-localstorage-design.md)

---

## File Structure

| File                              | Action | Responsibility                                                    |
| --------------------------------- | ------ | ----------------------------------------------------------------- |
| `src/lib/storage.ts`              | Create | Module de persistance (types, load/save, debounce, export/import) |
| `src/components/Toast.astro`      | Create | Composant DOM toast (status live region)                          |
| `src/styles/components/toast.css` | Create | Styles du toast                                                   |
| `src/styles/global.css`           | Modify | Importer `toast.css`                                              |
| `src/components/Sidebar.astro`    | Modify | Remplacer 2 boutons par 3 (save/export/import)                    |
| `src/pages/index.astro`           | Modify | Bootstrap, restore titre, persist titre, câblage UI, helpers      |
| `src/components/Map.astro`        | Modify | Listen `ops-map:boot`, persist `moveend`                          |

**Note testing :** aucun runner de test n'est configuré. Chaque tâche se termine par une vérification manuelle (browser et/ou `npx astro check`) puis un commit. Les tests automatisés seront ajoutés une fois un runner configuré (hors scope de ce plan).

---

## Task 1 : Module `storage.ts` — Types, schema, load/save/validate

**Files:**

- Create: `src/lib/storage.ts`

- [ ] **Step 1 : Create `storage.ts` with types, constants, validation, load/save**

```ts
// src/lib/storage.ts

declare global {
  interface Window {
    __opsMapBoot?: {
      view: { center: [number, number]; zoom: number };
      restored: boolean;
    };
  }
}

const STORAGE_KEY = 'ops-map:state';
const SCHEMA_VERSION = 1;

export interface PersistedState {
  version: 1;
  savedAt: string;
  title: string;
  view: {
    center: [number, number];
    zoom: number;
  };
}

function isLatLng(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

function isValidState(raw: unknown): raw is PersistedState {
  if (typeof raw !== 'object' || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) return false;
  if (typeof obj.savedAt !== 'string') return false;
  if (typeof obj.title !== 'string') return false;
  if (typeof obj.view !== 'object' || obj.view === null) return false;
  const view = obj.view as Record<string, unknown>;
  if (!isLatLng(view.center)) return false;
  if (typeof view.zoom !== 'number') return false;
  return true;
}

function migrate(raw: unknown): PersistedState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const version = (raw as { version?: unknown }).version;
  if (version === SCHEMA_VERSION) {
    return isValidState(raw) ? raw : null;
  }
  // Future versions land here. Unknown version → null.
  return null;
}

function load(): PersistedState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('[storage] corrupted state in localStorage, ignoring');
    return null;
  }
  return migrate(parsed);
}

function save(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[storage] write failed', err);
  }
}
```

- [ ] **Step 2 : Run type check**

Run: `npx astro check`
Expected: 0 errors (the new file should type-check; ignore unrelated warnings if any).

- [ ] **Step 3 : Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat(storage): add persisted state schema with load/save validation"
```

---

## Task 2 : Module `storage.ts` — Bootstrap, getCurrent, update (debounced), saveNow

**Files:**

- Modify: `src/lib/storage.ts`

- [ ] **Step 1 : Append bootstrap/state-management API to `storage.ts`**

Add at the end of `src/lib/storage.ts`:

```ts
let current: PersistedState | null = null;
let saveTimer: number | null = null;
const DEBOUNCE_MS = 300;

export function bootstrap(defaults: PersistedState): {
  state: PersistedState;
  restored: boolean;
} {
  const loaded = load();
  if (loaded) {
    current = loaded;
    return { state: loaded, restored: true };
  }
  current = defaults;
  return { state: defaults, restored: false };
}

export function getCurrent(): PersistedState {
  if (current === null) {
    throw new Error('[storage] getCurrent called before bootstrap');
  }
  return current;
}

export function update(patch: Partial<Omit<PersistedState, 'version'>>): void {
  if (current === null) {
    throw new Error('[storage] update called before bootstrap');
  }
  current = {
    ...current,
    ...patch,
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
  };
  scheduleSave();
}

export function saveNow(): void {
  if (current === null) return;
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  save(current);
}

function scheduleSave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    if (current !== null) save(current);
  }, DEBOUNCE_MS);
}
```

- [ ] **Step 2 : Run type check**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat(storage): add bootstrap, update with debounce, and saveNow"
```

---

## Task 3 : Module `storage.ts` — `exportToFile` and `importFromFile`

**Files:**

- Modify: `src/lib/storage.ts`

- [ ] **Step 1 : Append export/import API and slug helper**

Add at the end of `src/lib/storage.ts`:

```ts
function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'operation';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function exportToFile(): void {
  if (current === null) {
    throw new Error('[storage] exportToFile called before bootstrap');
  }
  const json = JSON.stringify(current, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ops-map-${slugifyTitle(current.title)}-${todayIso()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFromFile(file: File): Promise<PersistedState> {
  return file.text().then((text) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Fichier invalide');
    }
    const migrated = migrate(parsed);
    if (migrated === null) {
      // Distinguish version mismatch from structural invalid
      const version = (parsed as { version?: unknown } | null)?.version;
      if (version !== undefined && version !== SCHEMA_VERSION) {
        throw new Error('Version non supportée');
      }
      throw new Error('Fichier invalide');
    }
    return migrated;
  });
}
```

- [ ] **Step 2 : Run type check**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat(storage): add exportToFile and importFromFile"
```

---

## Task 4 : Toast component + styles

**Files:**

- Create: `src/components/Toast.astro`
- Create: `src/styles/components/toast.css`
- Modify: `src/styles/global.css`

- [ ] **Step 1 : Create `Toast.astro`**

```astro
---
// src/components/Toast.astro
---

<div
  id="toast"
  class="c-toast"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  hidden
>
</div>
```

- [ ] **Step 2 : Create `toast.css`**

```css
/* src/styles/components/toast.css */
.c-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  translate: -50% 0;
  padding: 0.5rem 1rem;
  background: var(--color-surface-elevated);
  color: var(--color-fg-primary);
  border: 1px solid var(--color-line-default);
  border-radius: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  z-index: 1000;
  animation: toast-in 200ms ease-out;
}

@keyframes toast-in {
  from {
    opacity: 0;
    translate: -50% 0.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .c-toast {
    animation: none;
  }
}
```

- [ ] **Step 3 : Add the import in `global.css`**

Modify `src/styles/global.css` by adding the import line in the components block (after `marker.css`):

```css
@import './components/marker.css';
@import './components/toast.css';
```

- [ ] **Step 4 : Run type check**

Run: `npx astro check`
Expected: 0 errors (CSS import is not type-checked but the Astro file must be valid).

- [ ] **Step 5 : Commit**

```bash
git add src/components/Toast.astro src/styles/components/toast.css src/styles/global.css
git commit -m "feat(toast): add minimal toast component with reduced-motion support"
```

---

## Task 5 : Update Sidebar — three action buttons

**Files:**

- Modify: `src/components/Sidebar.astro`

- [ ] **Step 1 : Replace the imports and `actionItems` array**

In `src/components/Sidebar.astro`, replace lines 1-7 (imports block) and lines 17-20 (`actionItems`).

Replace the import block:

```astro
import MapPin from "@lucide/astro/icons/map-pin";
import Wrench from "@lucide/astro/icons/wrench";
import Settings from "@lucide/astro/icons/settings";
import Save from "@lucide/astro/icons/save";
import Download from "@lucide/astro/icons/download";
import Upload from "@lucide/astro/icons/upload";
import ChevronLeft from "@lucide/astro/icons/chevron-left";
```

Replace the `actionItems` constant:

```ts
const actionItems = [
  { id: 'save', label: 'Sauvegarder', Icon: Save },
  { id: 'export', label: 'Exporter', Icon: Download },
  { id: 'import', label: 'Importer', Icon: Upload },
] as const;
```

Note : the `FolderOpen` import is removed entirely.

- [ ] **Step 2 : Run type check**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 3 : Manual verification — visual**

Run: `npm run dev` (in a separate terminal, or `npx astro dev`)
Open: `http://localhost:4321`
Verify:

- The sidebar bottom group now shows three buttons (icons may differ from before).
- Hover each button : tooltip reads "Sauvegarder", "Exporter", "Importer" in order.
- Buttons do nothing on click yet (wiring comes in Task 8). No console errors.

- [ ] **Step 4 : Commit**

```bash
git add src/components/Sidebar.astro
git commit -m "feat(sidebar): replace Charger button with Exporter + Importer pair"
```

---

## Task 6 : Bootstrap + persist title in `index.astro`

**Files:**

- Modify: `src/pages/index.astro`

- [ ] **Step 1 : Import storage API and Toast component, render Toast**

In `src/pages/index.astro`:

a) Add the Toast import in the frontmatter (after the existing component imports):

```astro
import Toast from "../components/Toast.astro";
```

b) Render the Toast at the end of `<body>`, just before the closing `</body>` tag (after `<main>...</main>`):

```astro
		<Toast />
	</body>
```

c) In the `<script>` block at the bottom, replace the entire current script with the bootstrap-aware version. The full new script body (replaces lines 101-143) :

```ts
import { bootstrap, update, type PersistedState } from '../lib/storage';

const titleText = document.querySelector<HTMLElement>('[data-title-text]');
const titleInput = document.querySelector<HTMLInputElement>('#op-title');
const editBtn = document.querySelector<HTMLButtonElement>('button[data-action="edit-title"]');
const validateBtn = document.querySelector<HTMLButtonElement>(
  'button[data-action="validate-title"]',
);

if (titleText && titleInput && editBtn && validateBtn) {
  // Build defaults from the SSR-rendered DOM (random title + France-centered view)
  const defaults: PersistedState = {
    version: 1,
    savedAt: new Date().toISOString(),
    title: titleText.textContent ?? '',
    view: { center: [46.2, 2.2], zoom: 6 },
  };

  const { state, restored } = bootstrap(defaults);

  // Apply restored title (1-frame flash acceptable)
  titleText.textContent = state.title;
  titleInput.value = state.title;

  // Expose initial view for Map.astro and notify it
  window.__opsMapBoot = { view: state.view, restored };
  window.dispatchEvent(new Event('ops-map:boot'));

  const enterEditMode = (): void => {
    titleInput.value = titleText.textContent ?? '';
    titleText.hidden = true;
    editBtn.hidden = true;
    titleInput.hidden = false;
    validateBtn.hidden = false;
    titleInput.focus();
    titleInput.select();
  };

  const exitEditMode = (): void => {
    const newTitle = titleInput.value;
    titleText.textContent = newTitle;
    titleInput.hidden = true;
    validateBtn.hidden = true;
    titleText.hidden = false;
    editBtn.hidden = false;
    editBtn.focus();
    update({ title: newTitle });
  };

  editBtn.addEventListener('click', enterEditMode);
  validateBtn.addEventListener('click', exitEditMode);
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      exitEditMode();
    } else if (e.key === 'Escape') {
      titleInput.value = titleText.textContent ?? '';
      exitEditMode();
    }
  });
}
```

- [ ] **Step 2 : Run type check**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 3 : Manual verification — title persistence**

Run dev server (if not already running): `npm run dev`
Open: `http://localhost:4321`
Verify (DevTools console open) :

- Page loads, title displays normally.
- Click pencil icon → edit input → type "TEST OPERATION" → Enter.
- DevTools → Application → Local Storage → `ops-map:state` should contain a JSON blob with `"title": "TEST OPERATION"`.
- Reload the page → the title still reads "TEST OPERATION" (no random regeneration).
- DevTools console : no errors. The `__opsMapBoot` global should be set (`window.__opsMapBoot`).

- [ ] **Step 4 : Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(persistence): bootstrap state + persist title on edit"
```

---

## Task 7 : Map.astro — listen `ops-map:boot` + persist on `moveend`

**Files:**

- Modify: `src/components/Map.astro`

- [ ] **Step 1 : Import `update` from storage and replace the view init + add moveend listener**

In `src/components/Map.astro`, modify the `<script>` block.

a) Add the import (after the existing `markers-store` import) :

```ts
import { update } from '../lib/storage';
```

b) Replace lines 62-67 (the current view-init block reading `container.dataset.center / zoom / bounds`) with :

```ts
const initView = (): void => {
  const boot = window.__opsMapBoot;
  if (boot?.restored) {
    map.setView(boot.view.center, boot.view.zoom);
    return;
  }
  // No restored state — honor SSR-provided dataset (always set by Map.astro template)
  const { center, zoom, bounds } = container.dataset;
  if (center && zoom) {
    map.setView(JSON.parse(center) as [number, number], Number(zoom));
  } else if (bounds) {
    map.fitBounds(JSON.parse(bounds) as [[number, number], [number, number]]);
  }
};

if (window.__opsMapBoot) {
  initView();
} else {
  window.addEventListener('ops-map:boot', initView, { once: true });
}
```

c) Add a `moveend` listener — append it just after the `map.on("click", ...)` handler (around line 108) :

```ts
map.on('moveend', () => {
  const c = map.getCenter();
  update({ view: { center: [c.lat, c.lng], zoom: map.getZoom() } });
});
```

- [ ] **Step 2 : Run type check**

Run: `npx astro check`
Expected: 0 errors. The `window.__opsMapBoot` type comes from the global declaration in `storage.ts`, which is in the project — Astro's TypeScript will pick it up automatically.

- [ ] **Step 3 : Manual verification — view persistence**

Restart dev server if needed.
Open: `http://localhost:4321` (clear localStorage first via DevTools : Application → Storage → Clear site data, then reload).
Verify :

- Map opens centered on France (initial fitBounds, since no storage yet).
- Pan + zoom to a different region (e.g. Paris zoomed in).
- Wait ~1 second for debounce, check `localStorage.ops-map:state` in DevTools — `view.center` and `view.zoom` reflect the new position.
- Reload page → map opens at the saved Paris view (no flicker through France first).
- Console : no errors.

- [ ] **Step 4 : Commit**

```bash
git add src/components/Map.astro
git commit -m "feat(persistence): restore map view on boot + persist on moveend"
```

---

## Task 8 : Wire Sauvegarder / Exporter / Importer buttons + `applyState` + `showToast`

**Files:**

- Modify: `src/pages/index.astro`

- [ ] **Step 1 : Extend the script in `index.astro` with button wiring and helpers**

Add the following inside the `if (titleText && titleInput && editBtn && validateBtn)` block of `index.astro`, AFTER the existing keydown listener on `titleInput` and BEFORE the closing `}` of that `if` block.

First, augment the imports block at the top of the script (replace the import line from Task 6) :

```ts
import {
  bootstrap,
  update,
  saveNow,
  exportToFile,
  importFromFile,
  type PersistedState,
} from '../lib/storage';
import { whenMapReady } from '../lib/leaflet-map-ref';
```

Then add the wiring + helpers (paste at the end of the `if (titleText && ...)` block) :

```ts
// --- Toast helper ---
let toastTimer: number | null = null;
const showToast = (message: string): void => {
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

// --- Apply a full state to the UI (used by Importer) ---
const applyState = (next: PersistedState): void => {
  update(next);
  saveNow();
  titleText.textContent = next.title;
  titleInput.value = next.title;
  whenMapReady((map) => {
    map.setView(next.view.center, next.view.zoom);
  });
};

// --- Sauvegarder ---
const saveBtn = document.querySelector<HTMLButtonElement>('button[data-action="save"]');
saveBtn?.addEventListener('click', () => {
  if (!titleInput.hidden) {
    // Force exit edit mode so the in-progress value gets persisted
    exitEditMode();
  }
  saveNow();
  showToast('Sauvegardé');
});

// --- Exporter ---
const exportBtn = document.querySelector<HTMLButtonElement>('button[data-action="export"]');
exportBtn?.addEventListener('click', () => {
  exportToFile();
});

// --- Importer ---
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
    fileInput.value = ''; // allow re-importing the same file
  }
});
```

- [ ] **Step 2 : Run type check**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 3 : Manual verification — Sauvegarder button**

Open the app : `http://localhost:4321`

- Click "Sauvegarder" in the sidebar.
- Toast "SAUVEGARDÉ" appears at bottom-center for ~2 seconds.
- DevTools Local Storage : `ops-map:state` updated with current `savedAt`.

- [ ] **Step 4 : Manual verification — Exporter button**

- Click "Exporter".
- A file `ops-map-<slug>-2026-04-27.json` (or matching today's date) downloads.
- Open the file : valid JSON matching the current state.

- [ ] **Step 5 : Manual verification — Importer button (happy path)**

- Edit the title to "BEFORE IMPORT", pan map somewhere recognizable, save.
- Edit title to "AFTER EDIT", pan map elsewhere.
- Click "Importer" → `confirm()` "Remplacer l'opération en cours ?" → OK.
- Pick the file you just exported.
- Title returns to "BEFORE IMPORT", map view returns to the saved location.
- Toast "IMPORTÉ" appears.
- Local Storage now reflects the imported state.

- [ ] **Step 6 : Manual verification — Importer error paths**

- Click "Importer" → `confirm()` → Cancel : nothing happens.
- Click "Importer" → OK → choose a non-JSON file (e.g. an image) : `alert("Fichier invalide")`.
- Create a JSON file with `{"version": 99}` content, import it : `alert("Version non supportée")`.
- Create a JSON file with `{"foo": "bar"}` content, import it : `alert("Fichier invalide")`.

- [ ] **Step 7 : Manual verification — Sauvegarder pendant édition titre**

- Click pencil to enter edit mode, type a new title (don't press Enter).
- Click "Sauvegarder" in sidebar.
- Edit mode exits, the typed value is committed to the title and saved to localStorage.
- Toast "SAUVEGARDÉ" appears.

- [ ] **Step 8 : Manual verification — incognito / no localStorage**

- Open the app in a private window (or block storage for the site in DevTools).
- App loads, title and map work. No console errors (a `console.warn` is acceptable, errors are not).
- Editing title and panning map don't crash. No persistence (expected).

- [ ] **Step 9 : Manual verification — reduced motion**

- DevTools → "Rendering" pane → toggle "Emulate CSS prefers-reduced-motion: reduce".
- Trigger a toast (click "Sauvegarder").
- Toast appears immediately without slide-in animation.

- [ ] **Step 10 : Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(persistence): wire Sauvegarder/Exporter/Importer buttons with toast"
```

---

## Final verification

After all tasks are complete, do a clean run-through of the full test plan from the spec :

- [ ] Reload after title edit → title restored
- [ ] Reload after pan/zoom → view restored
- [ ] Click "Sauvegarder" → toast "Sauvegardé"
- [ ] Click "Exporter" → file `.json` downloads with correct name
- [ ] Click "Importer" → `confirm()` → valid file → state restored + toast
- [ ] Cancel `confirm()` → nothing happens
- [ ] Import a corrupted file → alert "Fichier invalide"
- [ ] Import a `version: 2` file → alert "Version non supportée"
- [ ] Clear `localStorage` → reload → random title + France bounds
- [ ] Incognito → app works, persistence silently disabled
- [ ] "Sauvegarder" while editing title → auto-exit + value persisted
- [ ] Toast with `prefers-reduced-motion: reduce` → no animation

If everything passes, the feature is complete.
