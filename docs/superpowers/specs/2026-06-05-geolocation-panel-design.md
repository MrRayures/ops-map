# Panneau « Géolocalisation » — Design

**Date :** 2026-06-05
**Statut :** Validé (en attente revue spec)

## Objectif

Renommer le panneau « Recherche » en « Géolocalisation » et y ajouter un bouton
« Me géolocaliser » qui recadre la carte sur la position de l'utilisateur via l'API
`navigator.geolocation` du navigateur. La recherche d'adresse existante reste dans le
panneau.

## Décisions (issues du brainstorming)

- **Renommage :** label du panneau `Recherche` → `Géolocalisation`. L'icône loupe de
  la sidebar est **conservée**. L'`id` du panneau reste `search` (ne pas le renommer —
  voir Approche).
- **Bouton :** clic → obtenir la position → la carte vole (`map:fly`) vers ces
  coordonnées à un zoom rapproché. **Pas de marqueur** laissé sur la carte.
- **Erreurs :** affichées dans la zone de statut texte (`#address-status`, aria-live)
  déjà présente dans le panneau.

## Approche retenue

**Approche A — Étendre `AddressSearch.astro`.** Le panneau est conceptuellement une
seule unité (trouver un endroit sur la carte : par adresse ou par position). On ajoute
le bouton et la logique de géolocalisation dans le composant existant, en réutilisant
la zone de statut aria-live et l'événement `map:fly` déjà écouté par `Map.astro`.

Le nom de fichier `AddressSearch.astro` reste inchangé : le renommer toucherait
plusieurs imports (PanelGroup) pour zéro bénéfice fonctionnel (YAGNI).

Rejeté : (B) composant séparé — duplique ou complique le partage de la zone de statut ;
(C) module `lib/geolocation.ts` dédié — sur-abstraction pour ~15 lignes wrappant une
API navigateur, surtout sans runner de test dans le projet.

## Composants

### 1. Renommage — `src/data/panels.ts`

Changer uniquement le label de l'entrée `search` :

```ts
{ id: 'search', label: 'Géolocalisation', group: 'tools' },
```

L'`id` reste `search`. Conséquences : `panel-search` / `tab-search`, le mapping
`panelIcons.search` (icône loupe dans `Sidebar.astro`) et tout autre usage de l'id
restent valides. Le titre du panneau, rendu via `{panel.label}` dans
`PanelGroup.astro`, suit automatiquement.

### 2. Bouton « Me géolocaliser » — `src/components/AddressSearch.astro`

**Markup** (ajouté en haut du composant, avant le `<form>` de recherche) :

```astro
<Button variant="secondary" size="md" class="w-full" data-action="geolocate">
  <LocateFixed size={16} aria-hidden="true" />
  Me géolocaliser
</Button>
```

Imports ajoutés au frontmatter : `Button` depuis `./ui/Button.astro`, `LocateFixed`
depuis `@lucide/astro/icons/locate-fixed`.

**Logique** (script) :

- Récupérer le bouton via `[data-action="geolocate"]` et la zone `#address-status`
  (déjà référencée par le code de recherche).
- Au clic :
  - Si `!('geolocation' in navigator)` → statut « Géolocalisation non supportée », fin.
  - Sinon : statut « Localisation… », `button.disabled = true`, puis
    `navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true, timeout: 10000 })`.
- **Succès** `onSuccess(pos)` :
  - Émettre `window.dispatchEvent(new CustomEvent('map:fly', { detail: { center: [pos.coords.latitude, pos.coords.longitude] } }))`.
  - Le handler `map:fly` de `Map.astro` fait `flyTo(center, 15, { duration: 0.8 })`
    quand `bounds` est absent — comportement voulu (zoom rapproché).
  - Statut vidé, `button.disabled = false`.
- **Erreur** `onError(err)` : mapper `err.code` → message dans `#address-status` :
  - `PERMISSION_DENIED` (1) → « Permission de localisation refusée »
  - `POSITION_UNAVAILABLE` (2) → « Position indisponible »
  - `TIMEOUT` (3) → « La localisation a expiré »
  - défaut → « Échec de la géolocalisation »
  - `button.disabled = false`.

**Partage de la zone de statut :** la recherche et la géoloc écrivent toutes deux dans
`#address-status`. Un seul message s'affiche à la fois, ce qui est cohérent. La
géolocalisation n'appelle pas `search()` et ne touche pas le `token` de recherche.

### 3. Aucun changement — `src/components/Map.astro`

Le handler `map:fly` accepte déjà un `detail.center` seul et fait `flyTo(center, 15,
…)`. Rien à modifier.

## Gestion des erreurs

Toutes les erreurs de géolocalisation (non supporté, permission refusée, indisponible,
timeout) sont rapportées dans la zone aria-live `#address-status`, et le bouton est
toujours réactivé (pas d'état désactivé permanent).

## Stratégie de test

Pas de runner de test dans le projet ⇒ vérification par `npx astro check` (types) +
`npm run build`, puis test manuel :

- Renommage : l'onglet/le titre affiche « Géolocalisation » ; l'icône loupe inchangée.
- Clic « Me géolocaliser » → invite du navigateur → autorisation → la carte recadre
  sur la position (zoom ~15).
- Refus de permission → message « Permission de localisation refusée » ; bouton
  réutilisable.
- La recherche d'adresse fonctionne toujours.

## Fichiers touchés

**Modifiés :** `src/data/panels.ts` (label), `src/components/AddressSearch.astro`
(bouton + logique).

**Inchangés :** `src/components/Map.astro`, `src/components/Sidebar.astro` (icône
conservée via l'id `search`).
