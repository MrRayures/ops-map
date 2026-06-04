# Sidebar Tools Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer la sidebar en une rail où chaque outil et Paramètres sont des entrées (icône + label), avec un panel par entrée, panel fermé par défaut, et un bouton qui replie la rail (labels ↔ icônes).

**Architecture:** On enrichit `panels.ts` (5 entrées + champ `group`), on éclate `PanelGroup.astro` en un `<article>` par entrée (fermé par défaut), et on réécrit `Sidebar.astro` : rail repliable + logique d'onglets en activation manuelle avec toggle. `index.astro` est inchangé (bindings via `data-action`/`data-setting`).

**Tech Stack:** Astro 6, Tailwind 4, TypeScript strict, icônes `@lucide/astro`. Pas de runner de test dans le projet → vérification via `astro check` (types), `astro build` (compilation) et test manuel navigateur.

---

## Notes de vérification (ce projet n'a pas de tests unitaires)

Chaque tâche se vérifie par, dans l'ordre :

1. `npm run astro check` → 0 erreur de type.
2. (tâches finales) `npm run build` → build réussi.
3. Test manuel : `npm run dev`, ouvrir http://localhost:4321, exécuter le scénario décrit.

Il n'existe **aucun** fichier de test à créer — ne pas inventer de harness. Les "tests" sont les scénarios manuels listés.

## Structure des fichiers

- **Modifier** `src/data/panels.ts` — passe à 5 entrées + champ `group` + type `PanelGroupKey`. Supprime tout usage de `defaultPanel`.
- **Modifier** `src/components/PanelGroup.astro` — `data-state="closed"` initial, un `<article>` par entrée, mapping outil→composant.
- **Modifier** `src/components/Sidebar.astro` — rail repliable, entrées groupées icône+label, logique tabs réécrite (activation manuelle + toggle), `#panel-toggle` agit sur la rail, gestion Échap.
- `src/pages/index.astro` — **non modifié** (vérifié : bindings via `data-action`/`data-setting`, nœuds présents au SSR même si panel `hidden`).

Aucune création de fichier.

---

## Task 1: Enrichir le modèle de données `panels.ts`

**Files:**

- Modify: `src/data/panels.ts`

- [ ] **Step 1: Réécrire `panels.ts`**

Remplacer tout le contenu de `src/data/panels.ts` par :

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

- [ ] **Step 2: Vérifier les types**

Run: `npm run astro check`
Expected: des erreurs apparaissent dans `Sidebar.astro` et `PanelGroup.astro` (ils référencent encore l'ancien `panels`/`defaultPanel` et `panelIcons` avec les anciennes clés). C'est attendu — elles seront corrigées aux tâches 2 et 3. Vérifier qu'**aucune** erreur ne provient de `panels.ts` lui-même.

- [ ] **Step 3: Commit**

```bash
git add src/data/panels.ts
git commit -m "feat(panels): expand panel list to one entry per tool with group key"
```

---

## Task 2: Éclater `PanelGroup.astro` — un panel par entrée, fermé par défaut

**Files:**

- Modify: `src/components/PanelGroup.astro`

- [ ] **Step 1: Réécrire `PanelGroup.astro`**

Remplacer tout le contenu par (le bloc `settings` reprend exactement les `<fieldset>` existants ; les outils sont mappés 1:1) :

```astro
---
import { defaultMapStyle, mapStyles } from "../data/map-styles";
import { panelId, panels, tabId } from "../data/panels";
import { GRID_STEP_PRESETS } from "../data/settings";
import AddressSearch from "./AddressSearch.astro";
import MarkerEditor from "./MarkerEditor.astro";
import TextEditor from "./TextEditor.astro";
import ZoneEditor from "./ZoneEditor.astro";
---

<section
  id="panel-group"
  data-state="closed"
  inert
  aria-label="Contenu du panneau actif"
  class="flex h-full w-80 shrink-0 flex-col border-r border-line-default bg-surface-card text-fg-primary transition-[width] duration-200 ease-out data-[state=closed]:w-0 data-[state=closed]:overflow-hidden data-[state=closed]:border-r-transparent"
>
  {
    panels.map((panel) => (
      <article
        id={panelId(panel.id)}
        role="tabpanel"
        aria-labelledby={tabId(panel.id)}
        tabindex="0"
        hidden
        class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <h2 class="c-title text-base font-semibold tracking-tight text-fg-primary">
          <span>{panel.label}</span>
        </h2>

        {panel.id === "markers" && <MarkerEditor />}
        {panel.id === "zones" && <ZoneEditor />}
        {panel.id === "texts" && <TextEditor />}
        {panel.id === "search" && <AddressSearch />}

        {panel.id === "settings" && (
          <>
            <fieldset class="flex flex-col gap-3">
              <legend class="mb-1 font-mono text-sm font-semibold tracking-wider text-fg-primary uppercase">
                Cartes
              </legend>

              <div class="flex flex-col gap-1.5">
                <span class="font-mono text-xs font-semibold tracking-wider text-fg-secondary uppercase">
                  Styles
                </span>
                <div class="flex flex-col gap-2">
                  {mapStyles.map((style) => (
                    <label class="flex cursor-pointer items-center gap-3 rounded-sm border border-line-default px-3 py-2 text-sm transition-colors has-[:checked]:border-accent has-[:checked]:bg-surface-elevated has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
                      <input
                        type="radio"
                        name="map-style"
                        value={style.id}
                        checked={style.id === defaultMapStyle}
                        class="size-4 accent-[var(--color-accent)]"
                      />
                      <span class="text-fg-primary">{style.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            <fieldset class="flex flex-col gap-3">
              <legend class="mb-1 font-mono text-sm font-semibold tracking-wider text-fg-primary uppercase">
                Grille
              </legend>

              <div class="flex flex-col gap-1.5">
                <span class="font-mono text-xs font-semibold tracking-wider text-fg-secondary uppercase">
                  Affichage
                </span>
                <div role="radiogroup" aria-label="Afficher la grille" class="grid grid-cols-2 gap-2">
                  <label class="flex cursor-pointer items-center justify-center rounded-sm border border-line-default px-3 py-2 text-sm text-fg-primary transition-colors hover:bg-surface-elevated has-[:checked]:border-accent has-[:checked]:bg-surface-elevated has-[:checked]:text-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
                    <input
                      type="radio"
                      name="show-grid"
                      value="yes"
                      data-setting="show-grid"
                      class="sr-only"
                    />
                    Oui
                  </label>
                  <label class="flex cursor-pointer items-center justify-center rounded-sm border border-line-default px-3 py-2 text-sm text-fg-primary transition-colors hover:bg-surface-elevated has-[:checked]:border-accent has-[:checked]:bg-surface-elevated has-[:checked]:text-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
                    <input
                      type="radio"
                      name="show-grid"
                      value="no"
                      data-setting="show-grid"
                      class="sr-only"
                    />
                    Non
                  </label>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <span class="font-mono text-xs font-semibold tracking-wider text-fg-secondary uppercase">
                  Précision
                </span>
                <select
                  data-setting="grid-step"
                  class="w-full cursor-pointer rounded-sm border border-line-default bg-surface-card px-3 py-2 text-sm text-fg-primary focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {GRID_STEP_PRESETS.map((preset) => (
                    <option value={String(preset.value)}>{preset.label}</option>
                  ))}
                </select>
              </div>

              <div class="flex flex-col gap-1.5" data-cursor-coords-wrap>
                <span class="font-mono text-xs font-semibold tracking-wider text-fg-secondary uppercase">
                  Curseur
                </span>
                <label class="flex cursor-pointer items-center gap-3 rounded-sm border border-line-default px-3 py-2 text-sm transition-colors has-[:checked]:border-accent has-[:checked]:bg-surface-elevated has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  <input
                    type="checkbox"
                    data-setting="show-cursor-coords"
                    class="size-4 accent-[var(--color-accent)]"
                  />
                  <span class="text-fg-primary">Afficher les coordonnées</span>
                </label>
              </div>
            </fieldset>
          </>
        )}
      </article>
    ))
  }
</section>
```

Points clés vs version actuelle : `data-state="closed"` + `inert` au départ ; tous les `<article>` ont `hidden` (plus de `defaultPanel`) ; `MarkerEditor`/`ZoneEditor`/`TextEditor`/`AddressSearch` chacun dans son propre panel ; le `<hr>` qui séparait AddressSearch des éditeurs disparaît (search est isolé).

- [ ] **Step 2: Vérifier les types**

Run: `npm run astro check`
Expected: plus aucune erreur provenant de `PanelGroup.astro`. Il peut rester des erreurs dans `Sidebar.astro` (corrigées en tâche 3).

- [ ] **Step 3: Commit**

```bash
git add src/components/PanelGroup.astro
git commit -m "feat(panel-group): one panel per tool, closed by default"
```

---

## Task 3: Réécrire `Sidebar.astro` — markup rail repliable

**Files:**

- Modify: `src/components/Sidebar.astro`

- [ ] **Step 1: Réécrire le frontmatter et le markup (la balise `<script>` est traitée en Task 4)**

Remplacer le contenu du fichier depuis le début jusqu'à la fermeture `</aside>` (inclus) par le bloc ci-dessous. **Ne pas toucher** à la balise `<script>` existante à cette étape — elle sera remplacée en Task 4. Concrètement : remplacer les lignes du frontmatter `---... ---` et tout le `<aside>...</aside>`.

```astro
---
import MapPin from "@lucide/astro/icons/map-pin";
import Pentagon from "@lucide/astro/icons/pentagon";
import Type from "@lucide/astro/icons/type";
import Search from "@lucide/astro/icons/search";
import Settings from "@lucide/astro/icons/settings";
import Save from "@lucide/astro/icons/save";
import Download from "@lucide/astro/icons/download";
import Upload from "@lucide/astro/icons/upload";
import ChevronLeft from "@lucide/astro/icons/chevron-left";

import { panels, tabId, panelId, type PanelId } from "../data/panels";

const panelIcons = {
  markers: MapPin,
  zones: Pentagon,
  texts: Type,
  search: Search,
  settings: Settings,
} as const satisfies Record<PanelId, unknown>;

const groupLabels = {
  tools: "Outils",
  settings: "Réglages",
} as const;

const actionItems = [
  { id: "save", label: "Sauvegarder", Icon: Save },
  { id: "export", label: "Exporter", Icon: Download },
  { id: "import", label: "Importer", Icon: Upload },
] as const;

const navButton =
  "group/btn relative flex h-11 items-center gap-3 rounded-sm px-2.5 text-fg-secondary transition-colors hover:bg-surface-elevated hover:text-fg-primary aria-selected:bg-surface-elevated aria-selected:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const navLabel =
  "min-w-0 truncate text-sm group-data-[collapsed=true]/aside:hidden";

const groupLabelClass =
  "px-2.5 pt-2 pb-1 font-mono text-[0.625rem] tracking-wider text-fg-muted uppercase group-data-[collapsed=true]/aside:hidden";

const tooltip =
  "pointer-events-none absolute left-full top-1/2 z-10 ml-3 -translate-y-1/2 whitespace-nowrap rounded-sm bg-surface-elevated px-2 py-1 font-mono text-xs tracking-wider text-fg-primary uppercase shadow-lg opacity-0 transition-opacity group-data-[collapsed=true]/aside:group-hover/btn:opacity-100 group-data-[collapsed=true]/aside:group-focus-visible/btn:opacity-100";

const iconSize = 20;
---

<aside
  data-collapsed="false"
  class="group/aside flex h-full w-52 shrink-0 flex-col gap-1 border-r border-line-default bg-surface-base py-3 text-fg-primary transition-[width] duration-200 ease-out data-[collapsed=true]:w-16 data-[collapsed=true]:items-center"
  aria-label="Panneau latéral"
>
  <h1 class="contents">
    <a
      href="/"
      class="group/btn relative flex h-10 items-center gap-3 rounded-sm px-2.5 font-mono font-bold uppercase outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label="ops-map — accueil"
    >
      <span class="grid size-10 shrink-0 place-items-center rounded-sm bg-accent text-accent-on">OPS</span>
      <span class="text-sm tracking-wider group-data-[collapsed=true]/aside:hidden">ops-map</span>
      <span aria-hidden="true" class={tooltip}>ops-map</span>
    </a>
  </h1>

  <div class="my-1 h-px w-8 self-center bg-line-default" aria-hidden="true"></div>

  <nav aria-label="Navigation" class="flex flex-col">
    <ul role="tablist" aria-orientation="vertical" class="flex flex-col gap-1">
      {
        panels.map((item, index) => {
          const Icon = panelIcons[item.id];
          const prev = panels[index - 1];
          const showGroupLabel = !prev || prev.group !== item.group;
          return (
            <>
              {showGroupLabel && (
                <li role="presentation" class={groupLabelClass}>
                  {groupLabels[item.group]}
                </li>
              )}
              <li role="presentation">
                <button
                  type="button"
                  id={tabId(item.id)}
                  role="tab"
                  aria-selected="false"
                  aria-controls={panelId(item.id)}
                  tabindex={index === 0 ? 0 : -1}
                  class={navButton}
                >
                  <span class="grid size-5 shrink-0 place-items-center">
                    <Icon size={iconSize} aria-hidden="true" />
                  </span>
                  <span class={navLabel}>{item.label}</span>
                  <span aria-hidden="true" class={tooltip}>
                    {item.label}
                  </span>
                </button>
              </li>
            </>
          );
        })
      }
    </ul>
  </nav>

  <div
    class="mt-auto flex flex-col gap-1 self-stretch border-t border-line-default px-2 pt-3"
    role="group"
    aria-label="Persistance"
  >
    <span class={groupLabelClass}>Persistance</span>
    {
      actionItems.map(({ id, label, Icon }) => (
        <button type="button" data-action={id} class={navButton}>
          <span class="grid size-5 shrink-0 place-items-center">
            <Icon size={iconSize} aria-hidden="true" />
          </span>
          <span class={navLabel}>{label}</span>
          <span aria-hidden="true" class={tooltip}>
            {label}
          </span>
        </button>
      ))
    }
  </div>

  <div
    class="flex flex-col gap-1 self-stretch border-t border-line-default px-2 pt-3"
    role="group"
    aria-label="Affichage"
  >
    <button
      type="button"
      id="panel-toggle"
      aria-expanded="true"
      aria-controls="sidebar"
      aria-label="Réduire la barre"
      class={navButton}
    >
      <span class="grid size-5 shrink-0 place-items-center">
        <ChevronLeft
          size={iconSize}
          aria-hidden="true"
          class="transition-transform duration-200 group-data-[collapsed=true]/aside:rotate-180"
        />
      </span>
      <span class={navLabel} data-toggle-label>Réduire la barre</span>
      <span aria-hidden="true" class={tooltip} data-toggle-tooltip>Réduire la barre</span>
    </button>
  </div>
</aside>
```

Notes :

- La rail utilise `group/aside` + `data-collapsed` ; les labels (`navLabel`, `groupLabelClass`, le texte du logo) se masquent via `group-data-[collapsed=true]/aside:hidden`.
- Les tooltips ne s'affichent qu'en mode replié (`group-data-[collapsed=true]/aside:group-hover/btn:opacity-100`).
- `aria-selected="false"` sur tous les tabs au départ (aucun panel ouvert).
- Roving tabindex : seul le premier tab a `tabindex=0` initialement.
- `#panel-toggle` contrôle désormais la rail : `aria-controls="sidebar"` (voir Task 4 pour l'id), `aria-expanded="true"`, libellés « Réduire la barre ».

- [ ] **Step 2: Donner l'id `sidebar` à l'aside pour `aria-controls`**

Le bouton référence `aria-controls="sidebar"`. Ajouter `id="sidebar"` sur la balise `<aside>` : modifier la ligne `<aside` pour qu'elle commence par `<aside id="sidebar"`.

- [ ] **Step 3: Vérifier les types**

Run: `npm run astro check`
Expected: les seules erreurs restantes (s'il y en a) proviennent de l'ancien `<script>` de `Sidebar.astro` qui référence des variables/ids obsolètes — corrigé en Task 4. Aucune erreur de markup/frontmatter.

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.astro
git commit -m "feat(sidebar): collapsible rail markup with grouped icon+label entries"
```

---

## Task 4: Réécrire le `<script>` de `Sidebar.astro` — tabs toggle + repli rail + Échap

**Files:**

- Modify: `src/components/Sidebar.astro` (balise `<script>`)

- [ ] **Step 1: Remplacer entièrement la balise `<script>`**

Remplacer le `<script>...</script>` existant par :

```astro
<script>
  const sidebar = document.getElementById("sidebar");
  const tabs = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  );
  const panelGroup = document.getElementById("panel-group");
  const panels = Array.from(
    document.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
  );

  // --- Panel open/close (manual activation + toggle) ---
  function closePanel(): void {
    for (const tab of tabs) tab.setAttribute("aria-selected", "false");
    for (const panel of panels) panel.hidden = true;
    if (panelGroup) {
      panelGroup.dataset.state = "closed";
      panelGroup.setAttribute("inert", "");
    }
  }

  function openPanel(target: HTMLButtonElement): void {
    for (const tab of tabs) {
      tab.setAttribute("aria-selected", String(tab === target));
    }
    const controlsId = target.getAttribute("aria-controls");
    for (const panel of panels) {
      panel.hidden = panel.id !== controlsId;
    }
    if (panelGroup) {
      panelGroup.dataset.state = "open";
      panelGroup.removeAttribute("inert");
    }
  }

  function togglePanel(target: HTMLButtonElement): void {
    const isActive = target.getAttribute("aria-selected") === "true";
    if (isActive) closePanel();
    else openPanel(target);
  }

  function focusTab(tab: HTMLButtonElement): void {
    for (const t of tabs) t.tabIndex = t === tab ? 0 : -1;
    tab.focus();
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      focusTab(tab);
      togglePanel(tab);
    });
    tab.addEventListener("keydown", (event) => {
      const moveKeys = ["ArrowUp", "ArrowDown", "Home", "End"];
      if (moveKeys.includes(event.key)) {
        // Manual activation: arrows move focus only, do not open panels.
        event.preventDefault();
        const idx = tabs.indexOf(tab);
        let next: HTMLButtonElement;
        switch (event.key) {
          case "ArrowUp":
            next = tabs[idx - 1] ?? tabs[tabs.length - 1];
            break;
          case "ArrowDown":
            next = tabs[idx + 1] ?? tabs[0];
            break;
          case "Home":
            next = tabs[0];
            break;
          default:
            next = tabs[tabs.length - 1];
        }
        focusTab(next);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePanel(tab);
      }
    });
  }

  // --- Escape closes the active panel (focus in sidebar or panel) ---
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!panelGroup || panelGroup.dataset.state !== "open") return;
    const active = document.activeElement;
    const inScope =
      (sidebar && active instanceof Node && sidebar.contains(active)) ||
      (active instanceof Node && panelGroup.contains(active));
    if (!inScope) return;
    closePanel();
    const selected = tabs.find(
      (t) => t.getAttribute("aria-selected") === "true",
    );
    (selected ?? tabs[0])?.focus();
  });

  // --- #panel-toggle collapses/expands the RAIL (labels <-> icons) ---
  const toggle = document.getElementById("panel-toggle");
  if (sidebar && toggle) {
    const labelExpanded = "Réduire la barre";
    const labelCollapsed = "Développer la barre";
    const srLabel = toggle.querySelector<HTMLElement>("[data-toggle-label]");
    const tip = toggle.querySelector<HTMLElement>("[data-toggle-tooltip]");

    toggle.addEventListener("click", () => {
      const isCollapsed = sidebar.dataset.collapsed === "true";
      sidebar.dataset.collapsed = isCollapsed ? "false" : "true";
      toggle.setAttribute("aria-expanded", String(isCollapsed));
      const nextLabel = isCollapsed ? labelExpanded : labelCollapsed;
      toggle.setAttribute("aria-label", nextLabel);
      if (srLabel) srLabel.textContent = nextLabel;
      if (tip) tip.textContent = nextLabel;
    });
  }
</script>
```

Différences clés vs l'ancien script :

- `closePanel`/`openPanel`/`togglePanel` remplacent l'ancien `activate` (qui ouvrait toujours sans fermer).
- Flèches = focus seul (activation manuelle) ; Entrée/Espace ouvre/ferme.
- Échap ferme le panel actif si le focus est dans la sidebar ou le panel.
- `#panel-toggle` agit sur `#sidebar` (`data-collapsed`), **plus** sur `#panel-group`.
- Le bouton toggle ne touche jamais à l'état du panel → rail et panel indépendants.

- [ ] **Step 2: Vérifier les types**

Run: `npm run astro check`
Expected: PASS, 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.astro
git commit -m "feat(sidebar): tab toggle with manual activation, Escape close, rail collapse"
```

---

## Task 5: Vérification d'intégration (build + scénarios manuels)

**Files:** aucun (vérification seule).

- [ ] **Step 1: Build de production**

Run: `npm run build`
Expected: build réussi, 0 erreur.

- [ ] **Step 2: Lancer le dev server**

Run: `npm run dev`
Ouvrir http://localhost:4321

- [ ] **Step 3: Scénario — état initial**

Vérifier : la rail est **dépliée** (logo + labels « Marqueurs / Zones / Textes / Recherche » sous « Outils », « Paramètres » sous « Réglages », « Sauvegarder/Exporter/Importer » sous « Persistance », bouton « Réduire la barre »). **Aucun** panel n'est ouvert : la carte occupe toute la largeur à droite de la rail. Aucun onglet n'apparaît sélectionné (couleur accent).

- [ ] **Step 4: Scénario — ouvrir/fermer un outil (toggle)**

Cliquer « Marqueurs » → le panel s'ouvre à droite avec l'éditeur de marqueurs, l'onglet passe en accent. Re-cliquer « Marqueurs » → le panel se ferme, la carte reprend la largeur. Cliquer « Zones » puis « Textes » → un seul panel ouvert à la fois, le contenu bascule. Cliquer « Paramètres » → réglages Cartes + Grille visibles.

- [ ] **Step 5: Scénario — clavier (activation manuelle)**

Tabuler jusqu'à un onglet, presser Flèche bas/haut → le focus se déplace entre onglets **sans** ouvrir de panel. Presser Entrée ou Espace → ouvre le panel focalisé. Re-presser Entrée → ferme. Avec un panel ouvert, presser Échap (focus dans la sidebar ou le panel) → le panel se ferme, le focus revient sur l'onglet.

- [ ] **Step 6: Scénario — repli de la rail (indépendant du panel)**

Ouvrir un panel (ex. « Zones »). Cliquer « Réduire la barre » → la rail passe en icônes seules (64px), les labels disparaissent, le chevron pivote, le libellé devient « Développer la barre », **le panel reste ouvert**. Survoler une icône → tooltip. Re-cliquer le toggle → la rail se redéploie, labels de retour.

- [ ] **Step 7: Scénario — persistance (non-régression)**

Avec le panel « Paramètres » ouvert : changer le style de carte, basculer la grille Oui/Non, changer la précision, cocher « Afficher les coordonnées » → la carte réagit comme avant. Cliquer « Sauvegarder » → toast « Sauvegardé ». Cliquer « Exporter » → fichier JSON téléchargé. Modifier le titre de l'opération, puis « Importer » un export → l'état se recharge. (Ces bindings vivent dans `index.astro`, inchangé.)

- [ ] **Step 8: Commit final (si des ajustements ont été nécessaires)**

S'il a fallu corriger quoi que ce soit pendant les scénarios, committer les correctifs. Sinon, rien à committer.

```bash
git status
# si modifications :
git add -A && git commit -m "fix(sidebar): adjustments from manual verification"
```

---

## Self-review (effectuée)

- **Couverture spec :** modèle de données (T1), un panel/entrée + fermé par défaut (T2), rail repliable markup (T3), logique tabs toggle + activation manuelle + Échap + repli rail (T4), vérification critères de réussite (T5). AddressSearch isolé (T2). `index.astro` inchangé (vérifié, noté en T5/step7).
- **Pas de placeholder :** tout le code est complet et copiable.
- **Cohérence des noms :** `data-collapsed` (rail), `data-state` (panel), `closePanel`/`openPanel`/`togglePanel`/`focusTab` cohérents entre T4 et les scénarios T5. Ids : `sidebar`, `panel-group`, `panel-toggle`, `tab-<id>`/`panel-<id>` via helpers de T1.
- **Hors périmètre respecté :** pas de persistance du repli, pas d'animation de labels.

```

```
