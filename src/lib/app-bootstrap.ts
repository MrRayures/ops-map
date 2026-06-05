import {
  getState as getMarkersState,
  hydrate as hydrateMarkers,
  subscribe as subscribeMarkers,
} from './markers-store';
import {
  getState as getZonesState,
  hydrate as hydrateZones,
  subscribe as subscribeZones,
} from './zones-store';
import {
  getState as getTextsState,
  hydrate as hydrateTexts,
  subscribe as subscribeTexts,
} from './texts-store';
import { hydrate as hydrateSettings, subscribe as subscribeSettings } from './settings-store';
import { SCHEMA_VERSION, bootstrap, update, type PersistedState } from './storage';

export interface AppBoot {
  state: PersistedState;
  restored: boolean;
  titleInput: HTMLInputElement;
  terrainInput: HTMLInputElement;
  commitTitle: () => void;
  commitTerrain: () => void;
  /** Refresh the persistence guards after an external applyState/hydrate. */
  refreshPersistenceRefs: () => void;
}

/**
 * Boot the app: restore persisted state, hydrate stores, wire persistence,
 * expose the initial view to Map.astro, and bind title/terrain inputs.
 * Returns null if the required inputs are missing (page without settings panel).
 */
export function initApp(): AppBoot | null {
  const titleInput = document.querySelector<HTMLInputElement>('#op-title');
  const terrainInput = document.querySelector<HTMLInputElement>('#op-terrain');
  if (!titleInput || !terrainInput) return null;

  const defaults: PersistedState = {
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    title: titleInput.value,
    terrain: terrainInput.value,
    view: { center: [46.2, 2.2], zoom: 6 },
    markers: [],
    zones: [],
    texts: [],
    settings: { showGrid: false, gridStep: 'auto', showCursorCoords: false },
  };

  const { state, restored } = bootstrap(defaults);

  titleInput.value = state.title;
  terrainInput.value = state.terrain;

  window.__opsMapBoot = { view: state.view, restored };
  window.dispatchEvent(new Event('ops-map:boot'));

  // Persist on array changes only (selection/mode reuse the same ref).
  hydrateMarkers(state.markers);
  let lastMarkersRef = getMarkersState().markers;
  subscribeMarkers((s) => {
    if (s.markers === lastMarkersRef) return;
    lastMarkersRef = s.markers;
    update({ markers: [...s.markers] });
  });

  hydrateZones(state.zones);
  let lastZonesRef = getZonesState().zones;
  subscribeZones((s) => {
    if (s.zones === lastZonesRef) return;
    lastZonesRef = s.zones;
    update({ zones: [...s.zones] });
  });

  hydrateTexts(state.texts);
  let lastTextsRef = getTextsState().texts;
  subscribeTexts((s) => {
    if (s.texts === lastTextsRef) return;
    lastTextsRef = s.texts;
    update({ texts: [...s.texts] });
  });

  hydrateSettings(state.settings);
  subscribeSettings((s) => {
    update({ settings: { ...s } });
  });

  const commitTitle = (): void => {
    update({ title: titleInput.value });
  };
  const commitTerrain = (): void => {
    update({ terrain: terrainInput.value });
  };

  titleInput.addEventListener('change', commitTitle);
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleInput.blur();
    }
  });

  terrainInput.addEventListener('change', commitTerrain);
  terrainInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      terrainInput.blur();
    }
  });

  const refreshPersistenceRefs = (): void => {
    lastMarkersRef = getMarkersState().markers;
    lastZonesRef = getZonesState().zones;
    lastTextsRef = getTextsState().texts;
  };

  return {
    state,
    restored,
    titleInput,
    terrainInput,
    commitTitle,
    commitTerrain,
    refreshPersistenceRefs,
  };
}
