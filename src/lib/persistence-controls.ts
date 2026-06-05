import { exportToFile, importFromFile, saveNow, update, type PersistedState } from './storage';
import { whenMapReady } from './leaflet-map-ref';
import { hydrate as hydrateMarkers } from './markers-store';
import { hydrate as hydrateZones } from './zones-store';
import { hydrate as hydrateTexts } from './texts-store';
import { hydrate as hydrateSettings } from './settings-store';

interface PersistenceDeps {
  titleInput: HTMLInputElement;
  terrainInput: HTMLInputElement;
  showToast: (message: string) => void;
  commitTitle: () => void;
  commitTerrain: () => void;
  /** Called after hydrating, so the bootstrap can refresh its persistence refs. */
  onStateApplied: () => void;
}

/** Wire the Sauvegarder / Exporter / Importer buttons. */
export function initPersistenceControls(deps: PersistenceDeps): void {
  const { titleInput, terrainInput, showToast, commitTitle, commitTerrain, onStateApplied } = deps;

  const applyState = (next: PersistedState): void => {
    update(next);
    saveNow();
    titleInput.value = next.title;
    terrainInput.value = next.terrain;
    hydrateMarkers(next.markers);
    hydrateZones(next.zones);
    hydrateTexts(next.texts);
    hydrateSettings(next.settings);
    onStateApplied();
    whenMapReady((map) => {
      map.setView(next.view.center, next.view.zoom);
    });
  };

  const saveBtn = document.querySelector<HTMLButtonElement>('button[data-action="save"]');
  saveBtn?.addEventListener('click', () => {
    commitTitle();
    commitTerrain();
    saveNow();
    showToast('Sauvegardé');
  });

  const exportBtn = document.querySelector<HTMLButtonElement>('button[data-action="export"]');
  exportBtn?.addEventListener('click', () => {
    exportToFile();
  });

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';

  const importBtn = document.querySelector<HTMLButtonElement>('button[data-action="import"]');
  importBtn?.addEventListener('click', () => {
    if (!confirm("Remplacer l'opération en cours ?")) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const next = await importFromFile(file);
      applyState(next);
      showToast('Importé');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fichier invalide');
    } finally {
      fileInput.value = '';
    }
  });
}
