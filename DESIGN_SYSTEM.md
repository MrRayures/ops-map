# Midnight Tactical — Design System

Application : ops-map (création de cartes pour parties d'airsoft).
Mode : dark uniquement. Ambiance : tactique moderne, hybride militaire / gaming.

> Référence visuelle vivante : démarrer `npm run dev` puis ouvrir
> [http://localhost:4321/styleguide](http://localhost:4321/styleguide).

## Palette

Les tokens sont déclarés dans `src/styles/tokens.css` via la directive Tailwind v4
`@theme`. Chaque token devient à la fois une variable CSS (`var(--color-X)`) et
une classe utilitaire Tailwind (`bg-X`, `text-X`, `border-X`).

### Surfaces & lignes

| Token                      | Hex       | Utilitaire            | Usage                                |
| -------------------------- | --------- | --------------------- | ------------------------------------ |
| `--color-surface-base`     | `#0F1419` | `bg-surface-base`     | Fond app                             |
| `--color-surface-card`     | `#1A2230` | `bg-surface-card`     | Panneaux, cartes, modales            |
| `--color-surface-elevated` | `#2A3548` | `bg-surface-elevated` | Hover, dropdowns, tooltips, selected |
| `--color-line-subtle`      | `#1F2937` | `border-line-subtle`  | Séparateurs discrets                 |
| `--color-line-default`     | `#2A3548` | `border-line-default` | Bordures cartes & inputs             |

### Texte

| Token                  | Hex       | Utilitaire          | Usage                          |
| ---------------------- | --------- | ------------------- | ------------------------------ |
| `--color-fg-primary`   | `#E8ECF1` | `text-fg-primary`   | Texte principal                |
| `--color-fg-secondary` | `#9AA5B4` | `text-fg-secondary` | Labels, texte secondaire       |
| `--color-fg-muted`     | `#6B7785` | `text-fg-muted`     | Hints, placeholders, tertiaire |

### Accent signature

| Token                  | Hex       | Utilitaire        | Usage                                                          |
| ---------------------- | --------- | ----------------- | -------------------------------------------------------------- |
| `--color-accent`       | `#FFB627` | `bg-accent`       | Boutons primaires, focus, indicateurs actifs, mise en évidence |
| `--color-accent-hover` | `#FFC547` | `bg-accent-hover` | Hover                                                          |
| `--color-accent-on`    | `#4A3300` | `text-accent-on`  | Texte sur fond accent                                          |

> **Règle d'usage** : l'accent jaune doit rester **rare et signifiant**. Il ne marque
> que ce qui est interactif ou actif. Jamais pour de simples décorations.

### Équipes / factions, markers, sémantique

Voir `tokens.css` pour la liste complète : `--color-team-{red|blue|green|purple}`,
`--color-marker-{objective|spawn|danger|cover}`, `--color-{success|warning|danger|info}`.

## Conventions de styling

### Utility-first par défaut

Le code consomme les tokens via les classes utilitaires Tailwind directement dans
les templates. Pas de fichier CSS dédié pour les composants standards (Button,
Card, Badge, Overlay vivent dans `src/components/ui/*.astro` avec leurs classes
inline).

### BEM (`c-*`) ciblé pour 3 composants à signature CSS forte

Les seuls fichiers CSS dédiés sont dans `src/styles/components/` :

- **`.c-corner-brackets`** — équerres jaunes aux 4 coins (HUD frame). Implémentation :
  pseudo-éléments pour les 2 coins du haut, spans enfants `.c-corner-brackets-bl`
  et `.c-corner-brackets-br` requis pour les 2 coins du bas. Variant `.is-active`
  pour intensifier (épaisseur ×1.5 + glow).

  ```html
  <div class="c-corner-brackets relative h-48">
    <span class="c-corner-brackets-bl" aria-hidden="true"></span>
    <span class="c-corner-brackets-br" aria-hidden="true"></span>
    <!-- contenu -->
  </div>
  ```

- **`.c-grid-overlay`** — grille tactique en `repeating-linear-gradient`.
  À placer en `position:absolute` dans un parent relatif. `pointer-events:none`.

- **`.c-pin`** — cercle plein 16×16, bordure 2px ivoire (`--color-team-stroke`).
  Modifiers : `.is-team-{red|blue|green|purple}`, `.is-{objective|spawn|danger|cover}`.
  Seul `.is-objective` ajoute un glow (`--shadow-glow-objective`).

### Pourquoi ce hybride

Tailwind utility-first reste l'idiome de la stack et accélère le développement.
Les 3 BEM existent uniquement parce qu'elles encapsulent des effets composés
(pseudo-éléments multiples, shadows superposées, modifiers sémantiques) que
décrire en utilitaires seulement deviendrait illisible à chaque appel.

## Composants

### `src/components/ui/Button.astro`

Props : `variant: 'primary' | 'secondary' | 'ghost'`, `size: 'sm' | 'md'`,
`href?` (rend en `<a>`), `disabled?`, `class?`, `aria-label?`.

### `src/components/ui/Card.astro`

Slots : `header` (optionnel), default, `footer` (optionnel). Pour encadrer
une Card en équerres HUD, appliquer la classe `.c-corner-brackets` sur le
parent et inclure les deux spans enfants requis (cf. section
`.c-corner-brackets` ci-dessus).

### `src/components/ui/Badge.astro`

Props : `variant: 'live' | 'team' | 'status'`, `team?`, `status?`. Voir le
catalogue `/styleguide` §E pour des exemples.

### `src/components/ui/Overlay.astro`

Bloc HUD monospace avec bordure latérale gauche jaune. Idéal pour timer,
coordonnées, identifiants de secteur sur la carte.

## Typographie

- **Sans (contenu)** : Inter Variable (self-hosted via `@fontsource-variable/inter`).
- **Mono (HUD)** : JetBrains Mono Variable (via `@fontsource-variable/jetbrains-mono`).

Utiliser `font-mono` pour : timers, coordonnées, identifiants de secteur, labels
uppercase de sections / panneaux. Tout le reste reste en sans.

## Effets

- `shadow-glow-accent` (utilitaire Tailwind) — `box-shadow: 0 0 20px rgba(255,182,39,0.25)`.
  Pour boutons critiques en focus / état actif.
- `shadow-glow-objective` — utilisé par `.c-pin.is-objective`.
- `--bracket-*` (CSS vars) — paramètres des équerres HUD, modifiables localement
  pour des contextes spécifiques.

## Accessibilité

- WCAG AA : tous les couples texte / fond ont un ratio ≥ 4.5:1 (vérifié).
- `prefers-reduced-motion: reduce` : transitions et animations réduites à
  ~0ms (réglé dans `primitives.css`).
- `:focus-visible` partout, jamais `:focus` seul. Outline 2px `--color-accent`.
- Les pins / badges teams ont toujours un label texte associé — la couleur
  n'est jamais l'unique vecteur d'information.

## Mapping pour migration depuis l'ancienne palette

| Ancien (slate / emerald)                | Nouveau (Midnight Tactical)    |
| --------------------------------------- | ------------------------------ |
| `bg-slate-950`                          | `bg-surface-base`              |
| `bg-slate-900`                          | `bg-surface-card`              |
| `bg-slate-800`                          | `bg-surface-elevated`          |
| `border-slate-800`                      | `border-line-default`          |
| `text-slate-100/200/300` / `text-white` | `text-fg-primary`              |
| `text-slate-400`                        | `text-fg-secondary`            |
| `text-slate-500`                        | `text-fg-muted`                |
| `text-emerald-400`                      | `text-accent`                  |
| `bg-emerald-500`                        | `bg-accent text-accent-on`     |
| `border-emerald-500`                    | `border-accent`                |
| `outline-emerald-500`                   | `outline-accent`               |
| `accent-emerald-500`                    | `accent-[var(--color-accent)]` |

## Note sur le brief original

Le brief utilisait la convention `--bg-base`, `--text-primary`, `--border-default`.
Pour bénéficier de la génération automatique d'utilitaires Tailwind v4 sans
classes redondantes (`bg-bg-base`), les tokens sont stockés sous la convention
`surface-` / `fg-` / `line-` (`--color-surface-base`, `--color-fg-primary`,
`--color-line-default`). La sémantique est identique.
