# Sidebar — rail d'outils avec labels et repli

Date : 2026-05-22
Statut : validé (design), en attente revue spec

## Contexte

La sidebar actuelle est une rail verticale de 64px (icônes seules) avec :

- un logo OPS,
- une navigation par onglets à 2 entrées (`tools`, `settings`) pilotant le `PanelGroup`,
- un groupe d'actions de persistance (save / export / import),
- un bouton `#panel-toggle` qui réduit le `PanelGroup` (largeur 0).

Le panel `tools` empile aujourd'hui tous les éditeurs (MarkerEditor, ZoneEditor, TextEditor, AddressSearch) dans un seul `<article>`.

## Objectif

Transformer la sidebar en une rail où **chaque outil** et **Paramètres** sont des entrées distinctes (icône + label), réorganiser le `PanelGroup` en un panel par entrée, et redéfinir `#panel-toggle` pour qu'il replie la **rail** (labels ↔ icônes) au lieu du panel.

## Comportement cible

- La rail affiche, par défaut, **icône + label** pour chaque entrée (rail large ~200px).
- Les outils deviennent des entrées propres : **Marqueurs, Zones, Textes, Recherche** (AddressSearch isolé).
- **Paramètres** reste une entrée à part.
- **Au chargement : aucun panel ouvert.** Le `PanelGroup` est fermé (largeur 0), la rail seule est visible.
- Cliquer une entrée ouvre son contenu dans le `PanelGroup` à droite.
- Cliquer l'entrée **déjà active** ferme le panel (toggle).
- `#panel-toggle` replie/déplie la **rail** : déplié = labels visibles, replié = icônes seules (64px) avec tooltips au survol.
- Le repli de la rail et l'ouverture d'un panel sont **indépendants** (rail repliée + panel ouvert est un état valide).
- L'état replié n'est **pas persisté** entre sessions (repart à « déplié » à chaque chargement).

## Architecture

### `src/data/panels.ts`

La liste passe de 2 entrées à 5, avec un champ `group` pour afficher les labels de groupe et tracer les séparateurs :

```ts
export const panels = [
  { id: 'markers', label: 'Marqueurs', group: 'tools' },
  { id: 'zones', label: 'Zones', group: 'tools' },
  { id: 'texts', label: 'Textes', group: 'tools' },
  { id: 'search', label: 'Recherche', group: 'tools' },
  { id: 'settings', label: 'Paramètres', group: 'settings' },
] as const;

export type PanelId = (typeof panels)[number]['id'];
export type PanelGroupKey = (typeof panels)[number]['group'];

export const tabId = (id: PanelId) => `tab-${id}`;
export const panelId = (id: PanelId) => `panel-${id}`;
```

Les helpers `tabId` / `panelId` sont conservés. `defaultPanel` est supprimé (plus aucun panel par défaut).

### `src/components/PanelGroup.astro`

- Reste `<section id="panel-group">` mais démarre en **`data-state="closed"`** (largeur 0).
- Génère **un `<article role="tabpanel">` par entrée** de `panels`, tous `hidden` au chargement.
- Mapping du contenu :
  - `markers` → `<MarkerEditor />`
  - `zones` → `<ZoneEditor />`
  - `texts` → `<TextEditor />`
  - `search` → `<AddressSearch />`
  - `settings` → les deux `<fieldset>` (Cartes + Grille), inchangés
- Le `<h2>` de chaque panel reprend le `label` de l'entrée.
- Comme aucun panel n'est ouvert au chargement, le groupe porte aussi l'attribut `inert` initial (retiré à l'ouverture).

### `src/components/Sidebar.astro`

#### Structure

- `<aside>` avec `data-collapsed="false"` par défaut. Replié → `data-collapsed="true"` (largeur 64px, labels masqués).
- Trois zones :
  1. **Navigation** (`role="tablist"`, `aria-orientation="vertical"`) : entrées Outils + Réglages, chacune `role="tab"`, avec icône + label. Les labels de groupe (« Outils », « Réglages ») et séparateurs sont rendus à partir du champ `group`.
  2. **Persistance** (`role="group"`) : boutons `data-action` (save / export / import), **inchangés**.
  3. **Affichage** : bouton `#panel-toggle`.
- En mode déplié : icône + texte. En mode replié : icône seule + tooltip au survol (markup tooltip déjà présent, réutilisé).

#### Logique des onglets (réécrite — activation manuelle + toggle)

- État initial : **aucun** tab `aria-selected="true"`, `panel-group` fermé, tous panels `hidden`.
- **Clic** sur un tab inactif → `aria-selected="true"` sur ce tab (les autres `false`), `panel-group` passe `data-state="open"`, retire `inert`, affiche le panel correspondant (les autres `hidden`).
- **Clic** sur le tab déjà actif → `aria-selected="false"`, `panel-group` repasse `data-state="closed"`, ajoute `inert`, masque tous les panels.
- **Navigation clavier** (activation manuelle) :
  - `ArrowUp` / `ArrowDown` / `Home` / `End` → déplacent **uniquement le focus** entre tabs (roving tabindex), **sans** ouvrir de panel.
  - `Enter` / `Espace` (ou clic) → active/ouvre (ou ferme si déjà actif) le tab focalisé.
- **Échap** → ferme le panel actif (focus dans la sidebar ou le panel). Ne touche pas au repli de la rail.

#### `#panel-toggle` (réécrit)

- Ne touche **plus** au `panel-group`.
- Bascule `data-collapsed` sur l'`<aside>`.
- Met à jour `aria-expanded`, `aria-label` et le tooltip : « Réduire la barre » (déplié) ↔ « Développer la barre » (replié).
- Le chevron pivote (`rotate-180`) selon l'état.

### `src/pages/index.astro`

Aucun changement de logique attendu : tous les bindings reposent sur `data-action` et `data-setting`, sélecteurs qui survivent au découpage. Les éditeurs déménagent dans des panels distincts mais leurs sélecteurs internes sont inchangés. À vérifier après refactor : que `querySelector` sur les contrôles settings et les boutons d'action trouve toujours ses cibles (les nœuds existent dès le SSR, même si leur panel est `hidden`).

## Accessibilité

- Pattern tablist conservé. La sélection est **optionnelle** (un état « aucun panel ouvert » est valide) — c'est un écart toléré au pattern ARIA tabs classique, justifié par l'UX souhaitée.
- Activation **manuelle** des tabs (recommandation ARIA quand l'affichage du panel a un coût ou n'est pas désiré en navigation).
- Roving tabindex : un seul tab `tabindex="0"` à la fois (le dernier focalisé, ou le premier par défaut).
- Panels fermés : `hidden` + `inert` sur le groupe quand fermé.
- `:focus-visible` sur toutes les cibles interactives.
- Échap ferme le panel actif (conforme à `.claude/rules/a11y.md` — « Escape closes modals/popups »).
- En replié, les labels deviennent des tooltips ; chaque bouton garde un `aria-label` / `sr-only` pour rester accessible.

## CSS

- Largeurs et transitions via les tokens existants (midnight-tactical). Transition `width` sur la rail comme sur le panel-group.
- Mode replié géré par sélecteurs d'attribut (`[data-collapsed="true"]`) masquant labels et labels de groupe.
- Respect de `.claude/rules/css.md` (BEM plat, classes utilitaires Tailwind comme l'existant, pas d'`!important`).

## Hors périmètre (YAGNI)

- Persistance de l'état replié de la rail (peut être ajoutée plus tard via settings-store + version bump).
- Animation des labels (fade) au repli — un simple masquage suffit.
- Réorganisation/drag des entrées.

## Critères de réussite

1. Au chargement : rail dépliée avec labels, aucun panel ouvert, carte pleine largeur.
2. Clic sur un outil → son panel s'ouvre à droite ; re-clic → se ferme.
3. Un seul panel ouvert à la fois ; changer d'outil bascule le contenu.
4. `#panel-toggle` replie la rail en icônes seules (tooltips au survol) et la redéploie ; n'affecte pas le panel ouvert.
5. Navigation clavier : flèches déplacent le focus sans ouvrir ; Entrée/Espace ouvre/ferme ; Échap ferme le panel actif.
6. Les actions save / export / import et les réglages fonctionnent comme avant.
