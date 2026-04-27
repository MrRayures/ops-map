# Persistance localStorage — design

**Date** : 2026-04-27
**Statut** : design validé, en attente de plan d'implémentation
**Branche** : `feature/init-project`

## Objectif

Persister automatiquement l'état de l'opération en cours dans `localStorage` afin que l'utilisateur retrouve son travail après un reload. Permettre l'export et l'import d'un fichier JSON pour transférer l'état entre machines ou se prémunir contre la perte de données (vidage de cache).

Premier scope : **titre de l'opération** + **vue de la carte** (centre + zoom). Le module est conçu pour accueillir d'autres domaines (markers, panels) sans refonte.

## Décisions clés

| Décision            | Choix retenu                                                         | Motif                                                                     |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Format localStorage | Un seul blob versionné sous la clé `ops-map:state`                   | Lecture/écriture atomique, migrations centralisées, export/import trivial |
| Stratégie de save   | Auto-save debounced (300ms) + bouton manuel "Sauvegarder" avec toast | Zéro perte de données + feedback explicite à la demande                   |
| Versioning          | Champ `version: number`, fonction `migrate()` centralisée            | Évolutivité sans casser les fichiers existants                            |
| Validation          | À la lecture, type guards stricts ; échec → fallback aux défauts     | Robustesse face à un storage corrompu ou un fichier importé invalide      |
| Module              | `src/lib/storage.ts` unique, agnostique du DOM/Leaflet               | Réutilisabilité, testabilité                                              |

## Schéma des données

**Version 1** :

```ts
export interface PersistedState {
  version: 1;
  savedAt: string; // ISO 8601, utile pour debug et nom de fichier export
  title: string;
  view: {
    center: [number, number]; // [lat, lng], cohérent avec le code Leaflet existant
    zoom: number;
  };
  // markers?: PersistedMarker[];  // ajout futur
}
```

Exemple :

```json
{
  "version": 1,
  "savedAt": "2026-04-27T14:32:18.000Z",
  "title": "OPERATION DARK FALCON",
  "view": {
    "center": [46.6, 2.2],
    "zoom": 6
  }
}
```

## Architecture

### Nouveau module : `src/lib/storage.ts`

Module unique, sans dépendance au DOM ou à Leaflet. Il connaît uniquement la forme du blob et l'API `localStorage`.

```ts
const STORAGE_KEY = "ops-map:state";
const SCHEMA_VERSION = 1;

export interface PersistedState {
  /* cf. schéma */
}

let current: PersistedState;
let saveTimer: number | null = null;

// Init : lit storage, retourne l'état restauré (ou les défauts) + un flag indiquant l'origine
export function bootstrap(defaults: PersistedState): {
  state: PersistedState;
  restored: boolean;
};

// Lit l'état actuel en mémoire (utilisé par les boutons Sauvegarder/Exporter)
export function getCurrent(): PersistedState;

// Merge un patch dans l'état courant et déclenche un auto-save debounced
export function update(patch: Partial<PersistedState>): void;

// Force un save immédiat (utilisé par le bouton Sauvegarder)
export function saveNow(): void;

// Télécharge l'état courant comme fichier JSON
export function exportToFile(): void;

// Lit un fichier JSON, valide, retourne l'état (ne l'applique pas)
export function importFromFile(file: File): Promise<PersistedState>;

// Helpers internes
function load(): PersistedState | null; // lit + parse + valide + migre
function save(state: PersistedState): void; // écrit dans localStorage
function migrate(raw: unknown): PersistedState | null;
function isValidState(raw: unknown): raw is PersistedState;
```

### Validation à la lecture

`load()` :

1. `localStorage.getItem(STORAGE_KEY)` → si `null` retourne `null`.
2. `JSON.parse` dans try/catch → si échec retourne `null` + `console.warn`.
3. `migrate(raw)` → applique les migrations selon `raw.version` ; si version inconnue retourne `null`.
4. `isValidState(migrated)` → type guards stricts :
   - `typeof title === "string"`
   - `Array.isArray(view.center) && view.center.length === 2 && typeof view.center[0] === "number" && typeof view.center[1] === "number"`
   - `typeof view.zoom === "number"`
   - etc.
5. Retourne l'état validé.

L'écriture (`save()`) ne valide pas — l'écriture provient du code interne, à qui on fait confiance.

### Orchestration debounce

Le debounce vit dans `storage.ts` directement (option simple, pas de fichier `app-state.ts` séparé). `update()` reset un timer ; à expiration, `save(current)` écrit le blob complet.

`saveNow()` annule le timer et écrit immédiatement.

## Flux de restauration au boot

### Problème

- Le titre est généré côté serveur dans [index.astro:36-40](src/pages/index.astro#L36-L40) (random) et arrive dans le HTML statique.
- La carte appelle `map.fitBounds(FRANCE_BOUNDS)` au démarrage dans [Map.astro:65-67](src/components/Map.astro#L65-L67).

Il faut intercepter ces deux comportements.

### Convention partagée : `window.__opsMapBoot` + event `ops-map:boot`

**Problème de timing** : les `<script>` Astro sont des modules ESM async, l'ordre d'exécution entre `index.astro` et `Map.astro` n'est pas garanti. Il faut un mécanisme explicite.

**Solution** : `index.astro` fait le bootstrap, expose l'état sur `window.__opsMapBoot` et dispatche un event `ops-map:boot`. `Map.astro` lit l'objet en synchrone s'il est déjà présent, sinon attend l'event.

**Différenciation restauré vs défauts frais** : `__opsMapBoot.restored` indique si l'état vient du storage (true) ou des défauts (false). Map.astro l'utilise pour choisir entre `setView` (state restauré) et `fitBounds(FRANCE_BOUNDS)` (premier load).

**Typage global** — déclaré dans `src/lib/storage.ts` :

```ts
declare global {
  interface Window {
    __opsMapBoot?: {
      view: { center: [number, number]; zoom: number };
      restored: boolean;
    };
  }
}
```

### Modifications de l'API `storage.ts`

`bootstrap()` retourne désormais un tuple indiquant aussi si l'état est restauré :

```ts
export function bootstrap(defaults: PersistedState): {
  state: PersistedState;
  restored: boolean; // true si storage avait une valeur valide
};
```

### `index.astro` (script client modifié)

```ts
import {
  bootstrap, update, saveNow, exportToFile, importFromFile, getCurrent,
  type PersistedState,
} from "../lib/storage";

const titleText = /* ... */;
const titleInput = /* ... */;

// Construit les défauts depuis le DOM (titre random server-side)
const defaults: PersistedState = {
  version: 1,
  savedAt: new Date().toISOString(),
  title: titleText.textContent ?? "",
  view: { center: [46.2, 2.2], zoom: 6 },  // jamais utilisé visuellement (Map.astro fitBounds si !restored)
};

const { state, restored } = bootstrap(defaults);

// Applique le titre restauré (flash de ~1 frame acceptable)
titleText.textContent = state.title;
titleInput.value = state.title;

// Expose la vue à Map.astro + dispatche l'event pour signaler le boot
window.__opsMapBoot = { view: state.view, restored };
window.dispatchEvent(new Event("ops-map:boot"));

// Persiste à chaque sortie d'édition du titre
const exitEditMode = (): void => {
  // ... code existant ...
  update({ title: titleInput.value });
};
```

### `Map.astro` (script client modifié)

```ts
const initView = (): void => {
  const boot = window.__opsMapBoot;
  if (boot?.restored) {
    map.setView(boot.view.center, boot.view.zoom);
  } else {
    map.fitBounds(FRANCE_BOUNDS);
  }
};

if (window.__opsMapBoot) {
  // index.astro a déjà fini son bootstrap
  initView();
} else {
  // sinon, attend l'event (cas où Map.astro s'exécute en premier)
  window.addEventListener("ops-map:boot", initView, { once: true });
}

// Persiste à chaque mouvement de carte (debounced via update)
map.on("moveend", () => {
  const c = map.getCenter();
  update({ view: { center: [c.lat, c.lng], zoom: map.getZoom() } });
});
```

### Pendant l'édition du titre

Si l'utilisateur clique "Sauvegarder" pendant qu'il édite le titre, on force `exitEditMode()` avant `saveNow()` pour que la valeur en cours d'édition soit bien persistée. Plus intuitif que de sauver l'ancienne valeur.

## UI sidebar

### Modifications de `Sidebar.astro`

Remplacer [Sidebar.astro:17-20](src/components/Sidebar.astro#L17-L20) :

```ts
import Save from "@lucide/astro/icons/save";
import Download from "@lucide/astro/icons/download";
import Upload from "@lucide/astro/icons/upload";

const actionItems = [
  { id: "save", label: "Sauvegarder", Icon: Save },
  { id: "export", label: "Exporter", Icon: Download },
  { id: "import", label: "Importer", Icon: Upload },
] as const;
```

### Câblage des boutons

Vit dans `index.astro` (qui a accès au titre, au map ref via `leaflet-map-ref.ts`, et aux APIs storage). Pas de fichier dédié pour ne pas multiplier les modules à ce stade.

```ts
// Sauvegarder
document
  .querySelector('[data-action="save"]')
  ?.addEventListener("click", () => {
    if (!titleInput.hidden) exitEditMode(); // force exit si en édition
    saveNow();
    showToast("Sauvegardé");
  });

// Exporter
document
  .querySelector('[data-action="export"]')
  ?.addEventListener("click", () => {
    exportToFile();
  });

// Importer
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "application/json,.json";

document
  .querySelector('[data-action="import"]')
  ?.addEventListener("click", () => {
    if (!confirm("Remplacer l'opération en cours ?")) return;
    fileInput.click();
  });

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    const state = await importFromFile(file);
    applyState(state);
    showToast("Importé");
  } catch (err) {
    alert(err instanceof Error ? err.message : "Fichier invalide");
  } finally {
    fileInput.value = ""; // permet de réimporter le même fichier
  }
});
```

### `applyState(state)` — helper local

```ts
function applyState(state: PersistedState): void {
  // 1. Persiste (écrase l'état courant + déclenche save)
  update(state);
  saveNow();

  // 2. Met à jour le DOM titre
  titleText.textContent = state.title;
  titleInput.value = state.title;

  // 3. Met à jour la carte
  const map = getLeafletMap(); // depuis src/lib/leaflet-map-ref.ts
  if (map) map.setView(state.view.center, state.view.zoom);
}
```

### Format du fichier exporté

- Contenu : `JSON.stringify(getCurrent(), null, 2)`
- Nom : `ops-map-{slug}-{YYYY-MM-DD}.json`
  - `slug` : `state.title` minuscule, espaces → `-`, caractères non-alphanumériques retirés
  - Exemple : `ops-map-operation-dark-falcon-2026-04-27.json`
- MIME : `application/json`

## Toast

Composant minimal sans dépendance.

### `src/components/Toast.astro`

```astro
<div
  id="toast"
  class="c-toast"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  hidden
></div>
```

Importé une fois dans [index.astro](src/pages/index.astro), à la fin du `<body>`.

### `src/styles/components/toast.css`

```css
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

### API JS

Fonction locale dans `index.astro` (pas de module dédié pour une fonction de 10 lignes) :

```ts
let toastTimer: number | null = null;
function showToast(message: string): void {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.hidden = true;
  }, 2000);
}
```

## Cas particuliers

| Cas                                             | Comportement                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `localStorage` indisponible (mode privé Safari) | `try/catch` autour de `setItem` ; échec silencieux + `console.warn` ; l'app fonctionne sans persistance |
| Quota dépassé                                   | Très improbable avec un blob de quelques KB ; même comportement que ci-dessus                           |
| Storage modifié dans un autre onglet            | **Hors scope** ; pas de synchronisation cross-tab pour cette itération                                  |
| Import d'un fichier d'une version future        | `migrate()` retourne `null` → `importFromFile` rejette avec `Error("Version non supportée")` → alert    |
| Import d'un fichier corrompu / non-JSON         | `JSON.parse` échoue → rejet avec `Error("Fichier invalide")` → alert                                    |
| Save manuel pendant édition titre               | `exitEditMode()` automatique avant `saveNow()` (la valeur en cours est persistée)                       |
| Reduced motion                                  | Toast sans animation (couvert par `@media`)                                                             |

## Fichiers touchés

### Nouveaux

- `src/lib/storage.ts` — module de persistance
- `src/components/Toast.astro` — composant toast
- `src/styles/components/toast.css` — styles toast

### Modifiés

- `src/pages/index.astro` — bootstrap, câblage boutons, helper `applyState`, helper `showToast`
- `src/components/Map.astro` — lecture `window.__opsMapBoot`, listener `moveend`
- `src/components/Sidebar.astro` — `actionItems` (3 entrées au lieu de 2)
- `src/styles/global.css` — import du nouveau `toast.css`

## Test plan manuel

Aucun runner de test n'est configuré dans le projet à ce jour. Validation manuelle :

- [ ] Reload après modification du titre → titre restauré
- [ ] Reload après pan/zoom → vue restaurée
- [ ] Clic "Sauvegarder" → toast "Sauvegardé" pendant ~2s
- [ ] Clic "Exporter" → fichier `.json` téléchargé, nom correct, contenu valide
- [ ] Clic "Importer" → `confirm()` → choisir un fichier valide → titre + carte mis à jour + toast "Importé"
- [ ] Annuler le `confirm()` → rien ne se passe
- [ ] Importer un fichier corrompu → alert "Fichier invalide"
- [ ] Importer un fichier `version: 2` → alert "Version non supportée"
- [ ] Vider `localStorage` manuellement → reload → titre random + bounds France
- [ ] Mode incognito → app fonctionne, persistance silencieusement désactivée
- [ ] "Sauvegarder" pendant édition titre → sortie auto + valeur en cours persistée
- [ ] Toast avec `prefers-reduced-motion: reduce` → pas d'animation

## Limitations connues

- Pas de synchronisation entre onglets (un onglet écrasera l'autre au prochain save).
- Pas d'historique / undo après import (l'état précédent est perdu).
- Pas de tests automatisés (à ajouter quand un runner sera configuré dans le projet).
