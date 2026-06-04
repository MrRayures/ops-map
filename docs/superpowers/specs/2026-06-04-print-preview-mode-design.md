# Mode impression (aperçu interactif) — Design

Date : 2026-06-04
Statut : validé

## Objectif

Permettre d'imprimer la carte tactique via un **mode aperçu interactif** plein écran,
déclenché depuis un panneau « Impression » dédié dans la sidebar. L'utilisateur cadre
visuellement ce qui sera imprimé, ajuste l'orientation, puis lance l'impression. Le rendu
imprimé reprend exactement l'aperçu affiché à l'écran.

## Décisions de cadrage

- **Disposition** (option B) : carte plein cadre, légende et rose des vents en encarts
  flottants superposés sur la carte. Maximise la surface cartographique.
- **Déclenchement** (approche 1) : aperçu interactif visible à l'écran avant impression,
  pas un rendu `@media print` aveugle. L'utilisateur contrôle le rendu.
- **Zone d'impression** (option A) : cadre au ratio du papier, centré sur la vue carte
  actuelle. L'utilisateur cadre en déplaçant/zoomant la carte. Le ratio papier est
  toujours respecté → pas de déformation à l'impression. Pas de poignées de
  redimensionnement.
- **Format** (option 1) : Paysage / Portrait, A4 implicite. Le cadre change de ratio en
  direct quand l'orientation change. Pas de choix de format multiple (YAGNI).
- **Contenu carte** (option 1, WYSIWYG) : ce qui est visible à l'écran est imprimé
  (marqueurs, zones, textes, et la grille **si activée dans Réglages**). Pas de réglage
  d'inclusion séparé. La grille s'appuie sur son toggle existant.
- **Bande d'en-tête** (option 1) : `// OPERATION …` à gauche, `TERRAIN //` à droite.
  Style cohérent avec l'ancien `c-header` supprimé (fond accent, mono, majuscules).
  Pas de métadonnées pour l'instant.
- **Rose des vents** : SVG statique N/S/E/O, nord en haut (carte Leaflet non rotative).
- **Encart légende** : présent mais **vide** pour l'instant (titre « LÉGENDE » +
  placeholder). Contenu défini plus tard.

## Architecture

Le mode impression est un **état d'aperçu transitoire** (non persisté). Quand actif :

- `data-print-preview="true"` est posé sur `<body>` ;
- le CSS masque sidebar, panneau, contrôles de zoom ;
- un overlay d'aperçu apparaît par-dessus la carte (cadre + bande + légende + rose +
  barre d'actions) ;
- la carte Leaflet reste interactive (déplacement/zoom) pour cadrer ;
- actions : **Imprimer** (`window.print()`) et **Quitter l'aperçu**.

`@media print` réutilise le même rendu d'overlay ; seul le contenu carte + chrome
(bande/légende/rose) sort sur la page. `@page` applique l'orientation.

Un store léger `print-store.ts` (même pattern que `settings-store`) porte l'état pour
éviter d'entasser la logique dans `index.astro` et garder une frontière claire.

## Composants & fichiers

### Nouveau — `src/lib/print-store.ts`

État `{ active: boolean, orientation: 'landscape' | 'portrait' }`.
API : `getState`, `subscribe`, `setActive(bool)`, `setOrientation(...)`, `toggle()`.

### Nouveau — `src/components/PrintOverlay.astro`

Rendu une fois dans `index.astro`, à côté de `<Map />`. Caché par défaut, affiché quand
`print-store.active === true`. Contient :

- bande d'en-tête `[data-print-band]` — OP à gauche, terrain à droite, alimentée par les
  valeurs courantes title/terrain ;
- cadre de zone d'impression `[data-print-frame]` — centré, ratio papier, masque sombre
  autour (`box-shadow: 0 0 0 9999px rgba(0,0,0,.45)`) ;
- encart légende `[data-print-legend]` — flottant bas-droite, vide (titre + placeholder) ;
- rose des vents `[data-print-compass]` — flottante haut-droite, SVG N/S/E/O ;
- barre d'actions `[data-print-actions]` — boutons « Imprimer » / « Quitter » (masqués en
  `@media print`).

### Nouveau — `src/styles/components/print.css`

- styles de l'overlay et de ses éléments (tokens : `--color-accent`, `--font-mono`, …) ;
- bloc `@media print` : `@page { size: A4 landscape | portrait }`, masquage de tout sauf
  overlay + carte, neutralisation du masque sombre du cadre, `print-color-adjust: exact`
  sur la bande accent et la légende.
- Import ajouté dans `src/styles/global.css`.

### Modifié — `src/components/PanelGroup.astro`

Panneau `print` : **retirer** les cases « Inclure la grille » et « Inclure la légende »
(WYSIWYG). Conserver : radios **Orientation** (Paysage/Portrait) câblées au store, bouton
**Imprimer** qui **active l'aperçu** (n'imprime pas directement).

### Modifié — `src/pages/index.astro`

- importe et monte `<PrintOverlay />` ;
- câble radios orientation → `setOrientation` ;
- câble bouton « Imprimer » du panneau → `setActive(true)` ;
- câble boutons overlay : « Imprimer » → `window.print()`, « Quitter » → `setActive(false)` ;
- s'abonne au store pour poser/retirer `data-print-preview` sur `<body>` et mettre à jour
  le ratio du cadre selon l'orientation ;
- alimente la bande d'en-tête avec title/terrain courants.

## Flux d'interaction

1. Ouvrir le panneau Impression, choisir l'orientation (Paysage par défaut).
2. Clic « Imprimer » (panneau) → `setActive(true)`.
3. `index.astro` pose `data-print-preview="true"` → CSS masque le chrome, révèle l'overlay.
4. Overlay : bande, cadre ratio papier + masque sombre, légende (bas-droite), rose
   (haut-droite), barre d'actions.
5. L'utilisateur déplace/zoome la carte pour cadrer. Changer l'orientation met à jour le
   ratio du cadre en direct.
6. Clic « Imprimer » (overlay) → `window.print()`. `@media print` rend carte + chrome,
   `@page` applique l'orientation, le masque sombre est neutralisé.
7. Clic « Quitter » → `setActive(false)` → retour normal.
8. **Échap** ferme aussi l'aperçu (cohérent avec le pattern Échap de la sidebar).

## Points techniques & cas limites

- **Cadre ratio papier** : élément DOM centré sur le conteneur carte, dimensionné en CSS
  pur (`aspect-ratio` ≈ 1.414 + contraintes max-width/max-height). Cadrage purement visuel,
  aucun calcul Leaflet.
- **Impression** : `@media print` masque tout sauf `#map` + overlay ; tuiles raster Leaflet
  imprimées telles quelles ; `print-color-adjust: exact` pour préserver les couleurs de la
  bande/légende.
- **Tuiles non chargées** : limitation connue, non traitée. L'utilisateur cadre puis
  imprime ; les tuiles ont le temps de charger.
- **Rose des vents** : SVG statique, nord en haut.
- **Pas de persistance** : `active`/`orientation` sont transitoires, hors `PersistedState`.
  Orientation par défaut = Paysage à chaque session.

## Tests / vérification

Pas de runner de test configuré (`testing.md` : « à configurer »). Vérification :
`astro check` + `astro build` propres, puis validation visuelle manuelle — ouvrir
l'aperçu, changer l'orientation, vérifier l'aperçu navigateur (Ctrl+P) en paysage et
portrait.
