# Outil « Ligne » — Design

**Date :** 2026-06-05
**Statut :** Validé (en attente revue spec)

## Objectif

Ajouter un nouvel outil **Ligne** à OPS Map, à côté des outils Marqueurs, Zones et
Textes. Une ligne est une **polyligne ouverte** tracée sur la carte, avec deux
options : la **couleur** et la **forme du trait** (continu, tirets, pointillé).

## Décisions (issues du brainstorming)

- **Géométrie :** polyligne ouverte, **≥ 2 sommets**, sans maximum. Édition des
  sommets identique aux zones (déplacer, ajouter via point milieu, supprimer via
  clic droit).
- **Couleur :** réutilise le type `MarkerColor` existant (8 couleurs).
- **Forme :** `solid` | `dashed` | `dotted` (nouveau champ `style`).
- **Hors scope (YAGNI) :** pas de flèche/direction, pas de label.

## Approche retenue

**Approche A — Copier le pattern Zone, fichiers dédiés.** On reproduit fidèlement
l'architecture de l'outil Zone (data / store / layer / editor + câblage). Chaque
outil reste isolé, avec son propre store et sa propre couche. Les rares différences
(polyligne au lieu de polygone, min 2 au lieu de 3, pas de remplissage / masque /
play-area / label, nouveau champ `style`) sont localisées.

Rejeté : (B) extraire une abstraction polyligne partagée — impliquerait de refactorer
le code Zone qui fonctionne (hors scope, risque de régression). (C) ligne comme
variante du type Zone — couple deux concepts distincts et alourdit le code Zone de
branches conditionnelles.

## Composants

### 1. Données — `src/data/lines.ts`

```ts
import { type MarkerColor } from './markers';

export const LINE_STYLES = ['solid', 'dashed', 'dotted'] as const;
export type LineStyle = (typeof LINE_STYLES)[number];

export interface Line {
  id: string;
  points: [number, number][]; // [lat, lng] vertices, length >= 2
  color: MarkerColor;
  style: LineStyle;
}

export type LineDraft = Omit<Line, 'id' | 'points'>;

export const DEFAULT_LINE_DRAFT: LineDraft = {
  color: 'team-blue',
  style: 'solid',
};

export const LINE_MIN_VERTICES = 2;
```

Calqué sur `data/zones.ts`. Différences : `points` ≥ 2, champ `style`, pas de
`label` ni `isPlayArea`.

Mapping `style` → `dashArray` Leaflet (appliqué dans la couche) :
`solid` → `undefined`, `dashed` → `"12 8"`, `dotted` → `"2 6"`.

### 2. Store — `src/lib/lines-store.ts`

Copie quasi-identique de `lib/zones-store.ts`. État : `lines`, `selectedId`,
`mode` (`'idle' | 'placing'`), `draft: LineDraft`, `draftPoints`.

Différences vs zones-store :

- `finishDraft()` exige **≥ 2** points (au lieu de 3) ; suppression de
  `applyPlayAreaUniqueness`.
- `removeVertex()` garde **≥ 2** sommets (au lieu de 3).
- Préfixe d'ID : `l-…`.

API exportée : `getState, subscribe, hydrate, setMode, updateDraft,
addDraftPoint, finishDraft, selectLine, updateSelected, moveSelectedVertex,
insertVertexAfter, removeVertex, deleteSelected`.

### 3. Couche Leaflet — `src/components/LineLayer.astro`

Composant à effet de bord (pas de DOM propre), calqué sur `ZoneLayer.astro` mais
simplifié : pas de masque, play-area, label ni centroïde.

- Rendu : `L.polyline(line.points, {...})` au lieu de `L.polygon`.
  - `className: c-line is-color-${color}`, `color: var(--color-${color})`,
    `weight: isSelected ? 5 : 3`, `opacity: 0.9`,
    `dashArray` selon le style (cf. mapping ci-dessus).
  - `click` → `selectLine(id)`.
- Handles de sommets (ligne sélectionnée) — identique à Zone : vertex draggable
  (`drag` met à jour `polyline.setLatLngs(livePoints)`, `dragend` →
  `moveSelectedVertex`), clic droit → `removeVertex` (si > 2 points), points milieu
  cliquables → `insertVertexAfter`.
  - **Différence :** la boucle des points milieu va de `0` à `length - 1` **sans**
    reboucler (pas de segment dernier→premier) car la ligne est ouverte.
- Aperçu de placement (`renderDraft`) : `pts.length >= 2` → `L.polyline` en
  pointillés (`dashArray: "4 4"`) + petits points à chaque sommet. Pas de branche
  polygone fermé.
- Groupes de couches : `linesGroup`, `handlesGroup`, `draftGroup` (pas de
  `labelsGroup` ni `maskGroup`). Garde `dragging` pour ne pas casser un drag en cours.

### 4. Éditeur — `src/components/LineEditor.astro`

Calqué sur `ZoneEditor.astro` via `EditorShell`, sans label ni case play-area, avec
un contrôle **Forme**.

- `EditorShell` : `rootAttr="data-line-editor"` (+ `idleAttr`, `formAttr`,
  `statusAttr`, `deleteAttr` préfixés `line-`), `idleLabel="Ajouter une ligne"`,
  `startAction="line-start-placing"`, `closeAction="line-cancel-or-deselect"`.
- Icône idle : `@lucide/astro/icons/spline`.
- Hints : placement (« Clic = ajouter un point · Double-clic ou Entrée = valider ·
  Échap = annuler ») et édition (« Glisser un point pour le déplacer · Clic sur un
  point intermédiaire pour ajouter un sommet · Clic droit pour supprimer »).
- Fieldset **Couleur** : `ColorSwatchGroup fieldAttr="data-line-field"
fieldValue="color"`.
- Fieldset **Forme** : `SegmentedControl` (3 colonnes) avec options
  Continu / Tirets / Pointillé via `data-line-field="style"`.
- Bouton « Valider » → `data-action="line-finish"` ; bouton supprimer →
  `data-action="line-delete"`.
- Script : miroir de ZoneEditor. Bindings via les helpers existants de
  `lib/editor-binding.ts` — `bindColorSwatches` pour la couleur **et** pour `style`
  (le helper est générique : il lit `data-value` et commit `{[key]: value}`),
  `reflectChecked` pour l'état actif des deux groupes. `closeEditor()` finalise si
  `draftPoints.length >= 2`. `finishBtn.disabled` si `< 2` points.

**Extension requise — `src/components/ui/SegmentedControl.astro` :** ajouter le
support de `columns: 3`. Ajouter `3` au type `Columns` et `3: "grid-cols-3"` à la map
`gridColsClass` (la classe `grid-cols-3` doit exister statiquement pour Tailwind).

### 5. Câblage (intégration)

1. **`src/data/panels.ts`** — ajouter `{ id: 'lines', label: 'Lignes', group:
'tools' }` après `zones`.
2. **`src/components/Sidebar.astro`** — importer l'icône `spline` et l'ajouter à
   `panelIcons` sous la clé `lines` (l'onglet est généré depuis `panels`).
3. **`src/pages/index.astro`** — monter `<LineLayer />` (à côté de `<ZoneLayer />`)
   et `<LineEditor />` dans le `PanelGroup`.
4. **`src/lib/app-bootstrap.ts`** — `hydrateLines(state.lines)` au boot ;
   s'abonner au store et appeler `update({ lines: [...] })` sur changement ;
   ajouter `lines: []` au state par défaut ; réhydrater après import.
5. **`src/lib/selection-coordinator.ts`** — étendre `Active` avec `'lines'`,
   ajouter à `panelForStore`, brancher l'exclusion mutuelle sélection/placement.

### 6. Persistance & migration — `src/lib/storage.ts`

Bump `SCHEMA_VERSION` : **8 → 9**.

- **`PersistedState`** : `version: 9`, ajouter `lines: Line[]` (import du type).
- **`isLine`** (nouveau, calqué sur `isZone`) : `id` string ; `points` array,
  length ≥ 2, chaque élément `isLatLng` ; `color` ∈ `MARKER_COLORS` ; `style` ∈
  `LINE_STYLES`.
- **`isValidState`** : `version === 9` et `Array.isArray(obj.lines) &&
obj.lines.every(isLine)`.
- **`migrate`** :
  - Ajouter `lines: []` dans chaque objet `upgraded` des branches existantes
    (v1 → v7) pour qu'elles passent le `isValidState` enrichi.
  - Ajouter une branche `version === 8` (v8 → v9) :
    ```ts
    if (version === 8) {
      const upgraded = { ...(raw as object), version: SCHEMA_VERSION, lines: [] };
      return isValidState(upgraded) ? upgraded : null;
    }
    ```

Résultat : tout état v1–v8 valide migre en v9 avec `lines: []` ; un fichier v9 se
charge tel quel ; version inconnue → `null`.

### 7. Styles — `src/styles/components/line.css`

Nouveau fichier, importé dans `src/styles/global.css`
(`@import './components/line.css';` après `zone.css`). Réduit par rapport à
`zone.css` (pas de fill, masque, ni label) :

- `.c-line { pointer-events: visibleStroke; }` — seul le trait capte les clics.
- `.c-line-vertex`, `.c-line-midpoint`, `.c-line-draft-vertex` — copies des handles
  de `zone.css` (mêmes dimensions/couleurs ; classes préfixées par composant selon
  la convention BEM `c-` du projet, pas de partage entre composants).

Pas de bloc `is-color-*` (inutile sans remplissage — la couleur du trait passe par
l'option Leaflet `color`). Les `dashArray` sont gérés côté Leaflet, pas en CSS.

## Stratégie de test

Suivre les conventions du projet (`.claude/rules/testing.md`) : tester les fonctions
pures et la logique de store en priorité.

- **`lines-store`** : `finishDraft` rejette < 2 points et réussit à ≥ 2 ;
  `removeVertex` ne descend pas sous 2 sommets ; `insertVertexAfter` /
  `moveSelectedVertex` ; sélection et `deleteSelected`.
- **`storage`** : `isLine` (cas valides / invalides : style inconnu, < 2 points,
  couleur invalide) ; migration v8 → v9 ajoute `lines: []` ; un état v9 valide
  charge ; les anciennes migrations restent valides avec `lines: []`.
- **Manuel / E2E (critique) :** tracer une ligne, changer couleur et forme, éditer
  les sommets, supprimer, sauvegarder/recharger, exporter/importer.

## Fichiers touchés

**Nouveaux :** `src/data/lines.ts`, `src/lib/lines-store.ts`,
`src/components/LineLayer.astro`, `src/components/LineEditor.astro`,
`src/styles/components/line.css`.

**Modifiés :** `src/data/panels.ts`, `src/components/Sidebar.astro`,
`src/pages/index.astro`, `src/lib/app-bootstrap.ts`,
`src/lib/selection-coordinator.ts`, `src/lib/storage.ts`,
`src/styles/global.css`, `src/components/ui/SegmentedControl.astro`.
