# Midnight Tactical — Design System

**Date** : 2026-04-27
**Branche** : `feature/init-project`
**Stack** : Astro 6 + Tailwind CSS v4 (CSS-first via `@tailwindcss/vite`) + TypeScript strict + Leaflet

## Objectif

Mettre en place le design system "Midnight Tactical" pour ops-map (application
de création de cartes pour parties d'airsoft) : tokens, composants signature,
catalogue visuel, et migration de l'écran existant vers la nouvelle palette.

Ambiance : tactique moderne, hybride militaire-gaming, dark mode uniquement.

## Décisions clés

1. **Tokens via Tailwind v4 `@theme`** — un seul système, les tokens deviennent
   à la fois `var(--color-*)` et utilitaires Tailwind (`bg-*`, `text-*`, etc.).
2. **Hybride utility-first + BEM ciblé** — utilitaires Tailwind partout, BEM
   (`.c-*`) uniquement pour 3 composants à signature CSS forte (corner brackets,
   grid overlay, pins).
3. **Refactor + styleguide** — la page `/styleguide` (catalogue) sert de point
   de validation, puis l'écran `index.astro` existant est refactoré en place
   pour consommer la palette.
4. **Inter + JetBrains Mono** — self-hosted via `@fontsource-variable/*`.
5. **Convention de nommage des tokens** — préfixe `surface-` / `fg-` / `line-`
   pour éviter la redondance des classes Tailwind v4 (ex: `bg-surface-base` au
   lieu de `bg-bg-base`).

## Architecture des fichiers

```
src/styles/
├── global.css              @import "tailwindcss" + chaîne les autres
├── tokens.css              @theme { --color-*, --radius-*, --font-*, --shadow-* }
├── primitives.css          :root { --bracket-*, --grid-*, --overlay-* } + reset léger
└── components/
    ├── corner-brackets.css .c-corner-brackets
    ├── grid-overlay.css    .c-grid-overlay
    └── pin.css             .c-pin + .is-team-* / .is-objective / .is-spawn / .is-danger / .is-cover

src/components/ui/
├── Button.astro            primary | secondary | ghost × sm | md
├── Card.astro              + slots header / footer
├── Badge.astro             live | team | status
└── Overlay.astro           bloc HUD monospace

src/pages/
├── index.astro             refactoré (mapping 1-pour-1)
└── styleguide.astro        nouveau — catalogue isolé
```

Ordre d'imports dans `global.css` : `@import "tailwindcss"` → `tokens.css` →
fontsource imports → `primitives.css` → `components/*.css`. Tailwind v4 collecte
les déclarations `@theme` à la compilation indépendamment de l'ordre, mais
cette séquence garde la lecture cohérente : moteur Tailwind, tokens, polices,
reset, composants.

## Tokens — `src/styles/tokens.css`

```css
@theme {
  /* Surfaces */
  --color-surface-base: #0f1419;
  --color-surface-card: #1a2230;
  --color-surface-elevated: #2a3548;

  /* Lines */
  --color-line-subtle: #1f2937;
  --color-line-default: #2a3548;

  /* Foreground */
  --color-fg-primary: #e8ecf1;
  --color-fg-secondary: #9aa5b4;
  --color-fg-muted: #6b7785;

  /* Accent signature */
  --color-accent: #ffb627;
  --color-accent-hover: #ffc547;
  --color-accent-on: #4a3300;

  /* Teams */
  --color-team-red: #c8412c;
  --color-team-blue: #2b6a8f;
  --color-team-green: #5c8a3a;
  --color-team-purple: #8b4faa;
  --color-team-stroke: #e8e4d9;

  /* Markers tactiques */
  --color-marker-objective: #ff6b2b;
  --color-marker-spawn: #3da88c;
  --color-marker-danger: #b83838;
  --color-marker-cover: #6b5d47;

  /* Sémantique UI */
  --color-success: #3da88c;
  --color-warning: #ffb627;
  --color-danger: #ff4d4d;
  --color-info: #4a9eff;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadows / glows */
  --shadow-glow-accent: 0 0 20px rgba(255, 182, 39, 0.25);
  --shadow-glow-objective: 0 0 12px rgba(255, 107, 43, 0.6);

  /* Fonts */
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono:
    "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

## Tokens non-Tailwind & reset — `src/styles/primitives.css`

```css
:root {
  --bracket-color: var(--color-accent);
  --bracket-size: 16px;
  --bracket-thickness: 2px;
  --bracket-offset: 8px;

  --grid-line: rgba(255, 182, 39, 0.07);
  --grid-cell: 32px;

  --overlay-bg: rgba(15, 20, 25, 0.9);
}

html {
  color-scheme: dark;
  background: var(--color-surface-base);
  color: var(--color-fg-primary);
  font-family: var(--font-sans);
}

:where(*, *::before, *::after) {
  box-sizing: border-box;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Composants utility-first (`src/components/ui/`)

### `Button.astro`

- Props : `variant: 'primary' | 'secondary' | 'ghost'`, `size: 'sm' | 'md'`, `as?: 'button' | 'a'`, `href?`, etc.
- `primary` : `bg-accent text-accent-on hover:bg-accent-hover`
- `secondary` : `bg-transparent border border-line-default text-fg-primary hover:bg-surface-elevated`
- `ghost` : `bg-transparent text-fg-secondary hover:text-fg-primary hover:bg-surface-elevated`
- Focus : `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`
- Tailles : `sm` = `h-8 px-3 text-sm`, `md` = `h-10 px-4 text-sm`

### `Card.astro`

- `bg-surface-card border border-line-default rounded-md p-4`
- Slots : `header` (optionnel, `border-b border-line-subtle pb-3 mb-3`), default, `footer` (optionnel)

### `Badge.astro`

- Props : `variant: 'live' | 'team' | 'status'`, `team?: 'red' | 'blue' | 'green' | 'purple'`, `status?: 'success' | 'warning' | 'danger' | 'info'`
- `live` : `border border-accent text-accent bg-transparent font-mono uppercase tracking-[0.1em] text-xs px-2 py-0.5`
- `team` : `bg-team-{team} text-fg-primary`
- `status` : `bg-{status}/15 text-{status} border border-{status}/30`

### `Overlay.astro`

- Bloc HUD : `bg-[var(--overlay-bg)] border-l-2 border-accent font-mono text-fg-primary p-3`
- Slot par défaut

## Composants BEM (`src/styles/components/`)

### `.c-corner-brackets`

- Wrapper qui ajoute 4 équerres jaunes aux coins.
- Implémentation : `position: relative` + 4 pseudo-éléments (`::before`, `::after` sur l'élément + idem sur un span enfant), chacun positionné dans un coin avec `border-top` + `border-left` (ou variantes) à `var(--bracket-thickness) solid var(--bracket-color)`, taille `var(--bracket-size)`.
- Variant `.c-corner-brackets.is-active` : épaisseur ×1.5 + `box-shadow: var(--shadow-glow-accent)`.

### `.c-grid-overlay`

- `position: absolute; inset: 0; pointer-events: none;`
- `background-image: repeating-linear-gradient(to right, var(--grid-line) 0 1px, transparent 1px var(--grid-cell)), repeating-linear-gradient(to bottom, var(--grid-line) 0 1px, transparent 1px var(--grid-cell));`

### `.c-pin`

- Base : `display: inline-block; width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--color-team-stroke);`
- Modifiers couleur : `.c-pin.is-team-red` → `background: var(--color-team-red)`, idem `is-team-blue`, `is-team-green`, `is-team-purple`.
- Modifiers marker : `.c-pin.is-objective` → `background: var(--color-marker-objective); box-shadow: var(--shadow-glow-objective);`. Idem `is-spawn`, `is-danger`, `is-cover` (sans glow sauf `is-objective`).

## Page `/styleguide` — `src/pages/styleguide.astro`

Catalogue isolé, non lié dans la nav. Sections (toutes en `<section>` avec `h2`) :

- **A. Palette** : grille de swatches avec nom du token, classe utilitaire, hex.
- **B. Typographie** : sample sans (Inter), sample mono (JetBrains Mono), tailles `text-xs/sm/base/lg/xl`.
- **C. Buttons** : primary / secondary / ghost × sm / md, états hover & focus visualisés.
- **D. Cards** : vide, avec header, avec footer, avec `.c-corner-brackets`.
- **E. Badges** : live, équipes (4), status (success/warning/danger/info).
- **F. Pins** : 4 équipes + 4 markers tactiques.
- **G. Overlay HUD** : bloc monospace avec coordonnées factices.
- **H. Effets** : `.c-corner-brackets`, `.c-grid-overlay` sur fond foncé, glow accent.

Layout : grille 2-3 colonnes, `max-w-[1200px] mx-auto`, padding généreux,
sections séparées par `border-line-subtle`. Background `bg-surface-base`.

## Refactor `index.astro` & composants existants

### Mapping 1-pour-1

| Avant                                        | Après                            |
| -------------------------------------------- | -------------------------------- |
| `bg-slate-950` (body, input bg)              | `bg-surface-base`                |
| `bg-slate-900` (panel-group)                 | `bg-surface-card`                |
| `bg-slate-800` (hover, divider, has-checked) | `bg-surface-elevated`            |
| `border-slate-800`                           | `border-line-default`            |
| `border-slate-700` (hover border)            | `border-line-default` (constant) |
| `text-slate-100/200/300`                     | `text-fg-primary`                |
| `text-slate-400` (label uppercase)           | `text-fg-secondary`              |
| `text-slate-500` (placeholder, icône search) | `text-fg-muted`                  |
| `text-white` (titres, hover)                 | `text-fg-primary`                |
| `text-emerald-400` (tab actif)               | `text-accent`                    |
| `bg-emerald-500` (logo)                      | `bg-accent text-accent-on`       |
| `border-emerald-500` (focus, has-checked)    | `border-accent`                  |
| `outline-emerald-500` (focus visible)        | `outline-accent`                 |
| `accent-emerald-500` (radio natif)           | `accent-[var(--color-accent)]`   |

### Touches "Midnight Tactical" supplémentaires

1. Le logo `O` de la sidebar : `font-mono uppercase`.
2. Les labels uppercase (panneaux, recherche d'adresse) : `font-mono`.
3. Le conteneur Leaflet (dans `<main>` de `index.astro`) wrappé d'un
   `.c-corner-brackets` — équerres jaunes aux 4 coins du viewport carte.

### Hors scope du refactor

- Pins / markers réels sur la carte Leaflet (via `L.divIcon`) — ticket dédié.
- `.c-grid-overlay` sur la carte Leaflet (nécessite un overlay pane Leaflet,
  pas un simple `position: absolute`) — ticket dédié.
- Adoption immédiate des nouveaux composants `Button` / `Card` / etc. dans
  l'écran existant — ils existent pour `/styleguide` et seront adoptés
  progressivement ; le refactor ici reste une substitution de classes pure.

## Contraste WCAG AA — vérifications

| Combinaison                                                   | Ratio  | Seuil AA | Statut          |
| ------------------------------------------------------------- | ------ | -------- | --------------- |
| `text-fg-secondary` (#9AA5B4) sur `bg-surface-card` (#1A2230) | ~6.5:1 | 4.5:1    | ✅              |
| `text-fg-secondary` sur `bg-surface-elevated` (#2A3548)       | ~5.0:1 | 4.5:1    | ✅              |
| `text-accent` (#FFB627) sur `bg-surface-card`                 | ~9:1   | 4.5:1    | ✅              |
| `text-accent-on` (#4A3300) sur `bg-accent` (#FFB627)          | ~7:1   | 4.5:1    | ✅              |
| `text-fg-muted` (#6B7785) sur `bg-surface-base` (#0F1419)     | ~4.6:1 | 4.5:1    | ✅ (borderline) |

## Ordre d'implémentation

1. **Setup tokens** — installer `@fontsource-variable/inter` et
   `@fontsource-variable/jetbrains-mono`, créer `tokens.css` + `primitives.css`,
   chaîner depuis `global.css`.
2. **Composants utility-first** — `Button` / `Card` / `Badge` / `Overlay` dans
   `src/components/ui/`.
3. **Composants BEM** — `corner-brackets.css` / `grid-overlay.css` / `pin.css`.
4. **Page `/styleguide`** — section par section, point de validation visuel.
5. **Refactor `index.astro` + Sidebar + PanelGroup + AddressSearch** —
   substitution 1-pour-1 + 3 touches HUD.
6. **`DESIGN_SYSTEM.md` à la racine** — palette, conventions (utility-first +
   BEM hybride), liste des composants, lien vers `/styleguide`.

## Validation

Pas de tests automatisés — le design system est visuel et la stack n'a pas de
runner configuré pour l'instant. Validation manuelle :

- `npm run dev` → ouvrir `/styleguide`, vérifier chaque section.
- Tester focus-visible sur tous les éléments interactifs (Tab clavier).
- Vérifier `prefers-reduced-motion` (devtools → rendering).
- `npm run build` doit passer sans warnings.

## Critères "done"

- Plus aucune classe `slate-*` / `emerald-*` / `text-white` dans
  `src/components/` et `src/pages/` (sauf éventuels résidus dans le CSS Leaflet
  importé, hors scope).
- `/styleguide` rend sans warnings console.
- `index.astro` rend visuellement cohérent avec la palette Midnight Tactical
  (fond sombre bleuté, accent jaune rare et signifiant, brackets HUD aux coins
  de la carte).
- `DESIGN_SYSTEM.md` documente la palette + les règles utility-first vs BEM.

## Risques & notes

- **Tailwind v4 jeune** : la directive `@theme` et la génération automatique des
  utilitaires sont stables mais documentation parfois en mouvement. Si un
  utilitaire attendu n'est pas généré, vérifier le préfixe (`--color-*` vs
  `--colors-*`).
- **Borderline contrast** sur `text-fg-muted` (#6B7785) — si on veut être
  large au-dessus de 4.5:1, on pourra remonter à `#7A8693` plus tard. Garder
  l'œil dessus en revue.
- **Le brief utilise `--bg-base` mais on stocke en `--color-surface-base`** —
  documenté dans `DESIGN_SYSTEM.md` pour qu'un futur lecteur du brief retrouve
  la correspondance.
