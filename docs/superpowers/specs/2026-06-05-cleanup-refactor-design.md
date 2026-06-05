# Mise au propre de ops-map — Design

**Date** : 2026-06-05
**Type** : Refactoring pur (aucun changement de comportement visible)
**Branche** : feature/init-project

## Objectif

Améliorer la lisibilité, la maintenabilité et la concision du code sans
modifier le comportement de l'application :

- Faciliter la lecture du HTML (composants réutilisables, classes sémantiques).
- Supprimer le code dupliqué (création de composants/données partagés).
- Découper la logique (scripts surchargés → modules concis).
- Externaliser les styles inline (Tailwind) vers des composants Astro et des
  CSS components `.c-`.

## Approche transverse

- **Hybride** : composants Astro réutilisables pour la structure +
  CSS components `.c-` pour les primitives de style. Conforme aux règles
  projet (`css.md` BEM plat, `astro.md`, `javascript.md`).
- **Par lots** : 4 lots indépendants. Après chaque lot, `npm run build`
  (inclut `astro check` = type-check) doit passer, puis vérification manuelle
  via `npm run dev`.
- **Invariant** : aucun changement de comportement. Les `data-*` ciblés par le
  JS existant sont préservés ; les composants de présentation émettent le même
  HTML observable.

## État de départ (constats)

- `MarkerEditor.astro` (400), `ZoneEditor.astro` (257), `TextEditor.astro`
  (200) partagent ~70 % de structure (idle/form/status/close/delete,
  pastilles couleur) et de logique (`if selectedId → updateSelected else
updateDraft`).
- Les maps `colorClass` / `colorLabels` sont copiées à l'identique dans les
  3 éditeurs.
- Patterns Tailwind répétés en chaînes inline : `<legend>`/`<label>`
  mono-uppercase, `<input>` texte, groupe de pastilles couleur, bouton
  segmenté (radios Oui/Non, orientation, content-kind).
- `ui/Button.astro` mappe ses variants vers des chaînes Tailwind inline.
- `index.astro` : ~430 lignes de script orchestrant bootstrap/persistence,
  exclusion mutuelle des sélections, toast, settings, zoom, print,
  import/export.
- Pas de runner de test configuré (`testing.md` → « à configurer »). La
  validation passe par le build (type-check) + vérification manuelle.

## Lot 1 — Données partagées + CSS boutons

**Risque** : quasi nul.

- Créer `src/data/marker-colors.ts` :
  - `MARKER_COLOR_CLASS: Record<MarkerColor, string>`
  - `MARKER_COLOR_LABELS: Record<MarkerColor, string>`
  - Déplacés depuis les 3 éditeurs ; les éditeurs importent au lieu de
    redéclarer.
- Créer `src/styles/components/button.css` :
  - `.c-btn`, `.c-btn--primary`, `.c-btn--secondary`, `.c-btn--ghost`,
    `.c-btn--sm`, `.c-btn--md` (BEM plat, conforme `css.md`).
- Refactorer `ui/Button.astro` pour composer ces classes au lieu des chaînes
  Tailwind (l'API du composant — props `variant`/`size`/`href`/… — ne change
  pas).
- Ajouter `@import './components/button.css';` dans `global.css`.

**Validation** : build OK ; boutons identiques visuellement (zoom, éditeurs,
print, sidebar persistance).

## Lot 2 — Composants de formulaire réutilisables

Nouveaux composants présentationnels dans `src/components/ui/` :

| Composant                | Rôle                                                     | Remplace                                  |
| ------------------------ | -------------------------------------------------------- | ----------------------------------------- |
| `FieldLabel.astro`       | `<label>`/`<legend>`/`<span>` mono-uppercase (prop `as`) | ~12 chaînes inline                        |
| `TextField.astro`        | label + input texte stylé                                | blocs label+input                         |
| `ColorSwatchGroup.astro` | grille de pastilles couleur (`role=radiogroup`)          | 3× bloc identique                         |
| `SegmentedControl.astro` | groupe de boutons/labels segmentés                       | radios Oui/Non, orientation, content-kind |

- Ajouter `src/styles/components/form.css` avec les primitives partagées :
  `.c-field-input`, `.c-swatch`, `.c-segment` (part « CSS component » de
  l'hybride). Import dans `global.css`.
- Ces composants restent **présentationnels** : ils émettent le HTML avec les
  `data-*` attendus ; le JS existant les sélectionne toujours via
  `[data-field=...]`. Comportement inchangé.

**Validation** : build OK ; formulaires (éditeurs, panneau settings, print)
identiques.

## Lot 3 — Éditeurs : structure et logique partagées

**a) Coque de présentation** — `EditorShell.astro` (slots) :

- Centralise : bouton idle (label + icône en slot), header
  (status `aria-live` + bouton fermer), wrapper delete avec bordure.
- Slots : `idle-icon`, `form` (champs spécifiques), `delete`.
- Chaque éditeur ne décrit plus que ses champs propres dans le slot `form`.

**b) Helper logique** — `src/lib/editor-binding.ts` :

- `commit(store, patch)` = `selectedId ? updateSelected(patch) : updateDraft(patch)`.
- `bindColorSwatches(root, store, field)`, `bindTextField(root, input, store, field)`
  pour les liaisons répétées.
- Chaque script d'éditeur garde sa logique spécifique : marker
  (shape/content/icon), zone (play-area/hints/finishDraft), text (value).

**Contrainte** : les stores exposent des signatures cohérentes (`getState`,
`updateSelected`, `updateDraft`, `select*`, `setMode`, `subscribe`).
Vérifier en début de lot que le typage générique passe proprement ; sinon
garder le helper simple/duck-typé plutôt qu'une abstraction lourde.

**Résultat attendu** : éditeurs nettement plus courts, comportement inchangé.

**Validation** : build OK ; chaque éditeur (placement, sélection, édition,
suppression, Escape) se comporte à l'identique.

## Lot 4 — Découpage du script `index.astro`

Extraire vers `src/lib/`, chaque module exportant une fonction `init(...)` :

| Module                     | Responsabilité                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `app-bootstrap.ts`         | defaults, `bootstrap()`, hydrate des 4 stores, wiring persistence (`lastXRef`), bind title/terrain |
| `selection-coordinator.ts` | exclusion mutuelle select/placing des 3 stores + ouverture du panneau d'édition                    |
| `toast.ts`                 | `showToast(message)` (timer, élément `#toast`)                                                     |
| `settings-controls.ts`     | bind radios grid / select step / toggle cursor-coords                                              |
| `zoom-controls.ts`         | bind boutons zoom + zoom-fit                                                                       |
| `print-controls.ts`        | preview print, orientation, Escape, sync DOM                                                       |
| `persistence-controls.ts`  | boutons Sauvegarder / Exporter / Importer + `applyState`                                           |

- `index.astro` ne garde qu'un script court : import + appel des `init()` dans
  l'ordre, en passant les dépendances partagées (`showToast`, `applyState`,
  helpers commit title/terrain).
- Pas de variables globales : dépendances passées par arguments
  (conforme `javascript.md`). Fonctions concises (≤ 30 lignes).

**Ordre de dépendances** : `toast` autonome ; `app-bootstrap` produit
`applyState` / commit title/terrain consommés par `persistence-controls` et
`print-controls`.

**Validation** : build OK ; bootstrap (restauration de vue/état),
exclusion mutuelle des sélections, toast, zoom, settings, print,
save/export/import identiques.

## Hors périmètre (YAGNI)

- Pas d'éditeur générique unique piloté par config (abstraction jugée trop
  lourde).
- Pas de refactoring non lié (Map.astro, stores internes, styleguide) sauf
  nécessité technique rencontrée pendant un lot.
- Pas d'ajout de runner de test (reste « à configurer »).

## Critère de succès

- 4 lots livrés, build vert après chacun.
- HTML des éditeurs et panneaux nettement plus lisible (classes sémantiques /
  composants).
- Zéro duplication des maps couleurs et des patterns de formulaire.
- `index.astro` réduit à un script d'orchestration court.
- Aucune régression de comportement observée en vérification manuelle.
