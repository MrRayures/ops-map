# Annotation Markers (itération 1)

**Date** : 2026-04-27
**Branche** : `feature/init-project`
**Stack** : Astro 6, Leaflet 1.9, Tailwind v4, TypeScript strict

## Objectif

Permettre à l'utilisateur de poser des marqueurs d'annotation sur la carte
depuis le panneau Outils. Chaque marqueur a une forme, une couleur, un
contenu (texte, icône, ou rien) et un label optionnel rendu en bandeau HUD
sous le marqueur. Marqueurs éditables après sélection (panneau = éditeur de
sélection courante). État en mémoire uniquement pour cette itération — pas de
persistance.

## Décisions clés (issues du brainstorming)

1. **Place mode déclenché par bouton** — clic sur "Ajouter un marqueur"
   active le mode placement, le prochain clic carte pose le marqueur configuré.
2. **Panneau Outils = éditeur de la sélection courante** — pas de liste de
   marqueurs, pas de popover Leaflet. Le formulaire bascule sur le marqueur
   cliqué.
3. **Contenu : texte XOR icône** (mutuellement exclusif via radio "Aucun /
   Texte / Icône"). Le label est un champ séparé affiché en bandeau monospace
   sous le marqueur.
4. **Palette curatée** — 8 couleurs du design system (4 teams + 4 markers
   tactiques). Pas d'accent jaune (réservé UI), pas de color picker. Default
   `team-red`.
5. **In-memory uniquement** — refresh = perte des marqueurs. Sauvegarder /
   Charger restent stubs ; ils seront un ticket dédié couvrant markers,
   zones et tracés futurs.
6. **`L.divIcon` + BEM `.c-marker`** — markers rendus via HTML+CSS arbitraire
   pour consommer les tokens Midnight Tactical et avoir le label HUD-style.

## Modèle de données — `src/data/markers.ts`

```ts
export type MarkerShape = "square" | "triangle" | "circle" | "diamond";

export type MarkerColor =
  | "team-red"
  | "team-blue"
  | "team-green"
  | "team-purple"
  | "marker-objective"
  | "marker-spawn"
  | "marker-danger"
  | "marker-cover";

export type MarkerIconId =
  | "flag"
  | "target"
  | "shield"
  | "eye"
  | "alert-triangle"
  | "swords"
  | "radio"
  | "package";

export type MarkerContent =
  | { kind: "none" }
  | { kind: "text"; value: string } // 1–3 caractères
  | { kind: "icon"; value: MarkerIconId };

export interface Marker {
  id: string; // crypto.randomUUID()
  lat: number;
  lng: number;
  shape: MarkerShape;
  color: MarkerColor;
  content: MarkerContent;
  label?: string; // freeform, affiché en bandeau monospace sous le marker
}

export const MARKER_SHAPES: readonly MarkerShape[];
export const MARKER_COLORS: readonly MarkerColor[];
export const MARKER_ICONS: readonly MarkerIconId[];

export const DEFAULT_MARKER_DRAFT = {
  shape: "square",
  color: "team-red",
  content: { kind: "none" },
  label: "",
} satisfies Omit<Marker, "id" | "lat" | "lng">;
```

Les 8 icônes Lucide initiales sont un point de départ. Élargir si besoin
(via ajout dans `MARKER_ICONS` + l'import correspondant dans `MarkerEditor`).

## Architecture & state

### Store ESM partagé — `src/lib/markers-store.ts`

Mini pub/sub maison (~50 lignes), pas de framework :

```ts
interface State {
  markers: Marker[];
  selectedId: string | null;
  mode: "idle" | "placing";
  draft: Omit<Marker, "id" | "lat" | "lng">;
}

createMarker(lat: number, lng: number, draft: ...): Marker
selectMarker(id: string | null): void
updateSelected(patch: Partial<...>): void
deleteSelected(): void
moveSelected(lat: number, lng: number): void
setMode(mode: "idle" | "placing"): void
updateDraft(patch: Partial<...>): void
subscribe(listener: (state: State) => void): () => void
getState(): State
```

Le store est un singleton ESM — tous les `import` du même module dans la même
page partagent l'instance (Vite dedupe).

### Consommateurs

- **`MarkerEditor.astro`** (panneau Outils) — lit `state.selectedId` et soit
  l'édite (si non-null), soit affiche le formulaire de draft (si placing) ou
  juste le bouton "+ Ajouter" (si idle et pas de sélection). Dispatch
  `updateSelected` / `updateDraft` / `deleteSelected` / `setMode("placing")`.

- **`MarkerLayer.astro`** (rendu carte) — écoute le store, sync les markers
  avec un `L.layerGroup`. Diff-based updates : quand le state change,
  applique les ajouts / suppressions / modifications uniquement sur les
  markers concernés. Bind les click + dragend handlers sur chaque marker.

- **`Map.astro` existant** — émet un `CustomEvent("map:ready", { detail: { map } })`
  une fois `L.map(...)` instancié. Écoute aussi `state.mode === "placing"`
  pour basculer le cursor en crosshair et intercepter le prochain `click`
  Leaflet via `createMarker(lat, lng, state.draft)`.

### Communication

Pour le state continu (markers, selection, mode) → store. Pour les events
one-shot (`map:fly` existant, `map:ready` nouveau) → `window.dispatchEvent`,
cohérent avec le pattern existant.

## Layout du panneau Outils — `MarkerEditor.astro`

### États du formulaire

**Idle, pas de sélection** :

```
+ Ajouter un marqueur            [Button primary]
```

**Placing OU sélection active** : le formulaire complet est déployé.

### Champs du formulaire

```
[✕ Annuler placement]   ou   [✕ Désélectionner]    selon le mode
                                                    (Button ghost)

FORME                                              (label mono uppercase)
[ □ ] [ △ ] [ ○ ] [ ◇ ]                            (4 toggles, selected = accent)

COULEUR
▣ ▣ ▣ ▣                                            (8 swatches, 2 × 4 grid)
▣ ▣ ▣ ▣

CONTENU
( ) Aucun  ( ) Texte  ( ) Icône                    (radio group)
[ champ texte 0–3 chars ]    si "Texte"
ou
⚑ ⊙ 🛡 👁 △ ⚔ 📡 📦                                  si "Icône"

LABEL (optionnel)
[ champ texte freeform              ]

────────────────                                   (visible si selectedId)
[Supprimer ce marqueur]                            (Button ghost danger)
```

### Flux

1. Clic **+ Ajouter** → `setMode("placing")` → formulaire déployé avec
   `state.draft` (initial = `DEFAULT_MARKER_DRAFT`).
2. Configure draft (forme/couleur/contenu/label) → `updateDraft(patch)` à
   chaque change.
3. Clic carte → `createMarker(lat, lng, draft)` → marker créé + sélectionné +
   `mode` revient à `idle`. Le formulaire reflète maintenant le marker créé.
4. Modifier dans le formulaire → `updateSelected(patch)` en temps réel → le
   rendu Leaflet se met à jour immédiatement.
5. Clic sur un autre marker carte → `selectMarker(otherId)` → formulaire
   bascule.
6. Clic fond carte (mode `idle`) → `selectMarker(null)`.
7. Clic fond carte (mode `placing`) → crée un nouveau marker.
8. **Échap** → désélectionne ou sort du place mode.
9. **Supprimer** (visible si selectedId) → `deleteSelected()` → form revient
   idle.

## Rendu Leaflet — `MarkerLayer.astro`

### Markup d'un marker

```html
<div
  class="c-marker is-shape-square is-color-team-red [is-selected]"
  data-id="..."
>
  <div class="c-marker-body">
    <span class="c-marker-text">LZ</span>
    <!-- si content.kind = text -->
    <!-- ou : -->
    <svg class="c-marker-icon" aria-hidden="true">...</svg>
    <!-- ou : rien -->
  </div>
  <div class="c-marker-label">MIKE 4</div>
  <!-- si label -->
</div>
```

Attaché à la carte via :

```ts
L.marker(latlng, {
  icon: L.divIcon({
    html,
    className: "", // pas de className Leaflet par défaut, on porte tout via le div racine
    iconSize: [32, 32], // taille du body (le label HUD déborde en dehors)
    iconAnchor: [16, 16], // centre — la coordonnée du clic correspond au centre du body
  }),
  draggable: true,
});
```

Le label HUD-style sous le marker déborde de `iconSize` ; c'est volontaire (Leaflet
laisse le débordement visible tant que le `divIcon` n'a pas `overflow:hidden`).

### CSS — `src/styles/components/marker.css`

```css
.c-marker {
  /* container divIcon, position absolue gérée par Leaflet */
  font-family: var(--font-mono);
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
  transform: rotate(-45deg); /* contenu remis droit */
}

/* Couleurs (8 modifiers) */
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
   (CSS outline ne suit pas clip-path/transform). Trade-off accepté :
   l'outline carré offset reste lisible comme indicateur de sélection,
   et reproduire la forme via box-shadow inset multiple ajouterait
   beaucoup de complexité pour peu de valeur visuelle. */
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
```

### Sync diff-based

À chaque tick du store, `MarkerLayer` calcule par `id` :

- markers ajoutés → crée un `L.marker` et l'ajoute au layer group
- markers supprimés → enlève du layer group
- markers modifiés → met à jour `setLatLng` + remplace le `divIcon`
- selectedId changé → applique/retire la classe `.is-selected`

Pas de wipe-and-redraw global (préserve les listeners + perf si beaucoup de
markers).

### Interactions

- Click marker → `selectMarker(id)` + `e.originalEvent.stopPropagation()` (évite
  le click "fond de carte").
- Click fond carte (mode `idle`) → `selectMarker(null)`.
- Click fond carte (mode `placing`) → `createMarker(lat, lng, draft)`.
- **Drag** : `dragstart` → `selectMarker(id)` (un drag sans click préalable doit
  quand même promouvoir le marker en sélection courante, sinon `moveSelected`
  agirait sur un autre marker). `dragend` → `moveSelected(newLat, newLng)`.

## Fichiers créés / modifiés

### Créés

```
src/data/markers.ts                       Types + constantes
src/lib/markers-store.ts                  Store ESM (~80 lignes)
src/styles/components/marker.css          BEM .c-marker + modifiers
src/components/MarkerEditor.astro         Panneau Outils
src/components/MarkerLayer.astro          Bridge store ↔ Leaflet
```

### Modifiés

```
src/components/PanelGroup.astro           Render <MarkerEditor /> dans panel.id === "tools"
src/pages/index.astro                     Importer + rendre <MarkerLayer /> à côté de <Map />
src/components/Map.astro                  Émettre map:ready + intercepter click selon mode
src/styles/global.css                     @import "./components/marker.css";
```

## Ordre d'implémentation (8 phases)

1. **Types & store** — `markers.ts` + `markers-store.ts`. Validation : `npm
run build` + appel inline du store dans la console.
2. **CSS marker** — `marker.css` + wire dans `global.css`. Validation :
   ajouter temporairement quelques `<div class="c-marker is-shape-X
is-color-Y">` dans `/styleguide` (ou un nouveau §I "Markers") pour vérif
   visuelle.
3. **MarkerLayer + map:ready** — Map émet `map:ready`. MarkerLayer écoute,
   crée son `L.layerGroup`, s'abonne au store. Validation : exposer un helper
   debug temporaire `window.__markers.create(lat, lng, draft)` et voir les
   markers apparaître.
4. **MarkerEditor — état idle** — affiche le bouton "+ Ajouter".
5. **Place mode** — bouton clic → `setMode("placing")` → cursor crosshair →
   next click carte crée + sélectionne. Form déployé.
6. **Édition live** — formulaire complet (forme/couleur/contenu/label) → live
   update via `updateSelected`.
7. **Click + drag + delete** — click marker pour select, drag pour
   reposition, bouton Supprimer.
8. **Polish** — Échap, focus management, a11y (aria-label, focus rings),
   reduced-motion check.

## Validation

Pas de tests automatisés (cohérent avec la stack). Chaque phase :
`npm run build` + `npm run dev` + vérif manuelle.

## Critères "done"

- Bouton "+ Ajouter un marqueur" présent dans le panneau Outils.
- Place mode fonctionnel : clic carte pose un marker à l'emplacement cliqué.
- 4 formes × 8 couleurs × 3 types de contenu (none / text 0–3 / icon × 8)
  rendus correctement, label HUD-style sous le marker quand renseigné.
- Click marker existant → sélectionne, formulaire bascule, modifications
  live.
- Drag marker → repositionne (lat/lng mis à jour dans le store).
- Bouton Supprimer enlève le marker sélectionné.
- Échap : sort du place mode ou désélectionne selon contexte.
- Focus rings jaunes (`outline-accent`) sur tous les contrôles du formulaire
  via Tab.
- `prefers-reduced-motion` respecté (pas d'animation Leaflet jarring sur
  marker create / move).
- `npm run build` passe sans warnings.
- Aucune classe `slate-` / `emerald-` / `text-white` / `bg-white` introduite
  dans les nouveaux fichiers.

## Hors scope (à venir si nécessaire)

- Persistance localStorage / Save & Load.
- Liste / table des markers dans le panneau (option C de Q2).
- Marker clustering, z-order custom, tooltips au hover.
- Multi-sélection, copy/paste, undo/redo.
- Markers en dehors des bounds de la carte — comportement Leaflet par défaut.
- Animations entrée / sortie des markers.

## Risques & notes

- **`L.divIcon` + drag** : drag fonctionne sur `L.marker` natif quel que soit
  son icône, donc pas un risque réel. Tester quand même en phase 7.
- **Cursor crosshair** : appliqué via une classe sur le `<div id="map">` quand
  `mode === "placing"`. Vérifier que ça surcharge bien le cursor par défaut
  Leaflet (`grab` / `grabbing`).
- **Perf** : diff-based update suffit largement pour des dizaines de markers.
  Si l'usage révèle des cas à 500+ markers, considérer `Leaflet.markercluster`
  comme évolution séparée.
- **Le store est un singleton de module** : pas de problème en SSR (Astro
  static), mais si on bascule un jour vers SSR avec rendering serveur, il
  faudra adapter (un store par requête).
