import { subscribe as subscribeSettings, update as updateSettings } from './settings-store';
import type { SettingsState } from '../data/settings';

/** Bind the Settings panel controls (grid on/off, step, cursor coords). */
export function initSettingsControls(initial: SettingsState): void {
  const gridRadios = document.querySelectorAll<HTMLInputElement>('input[data-setting="show-grid"]');
  if (gridRadios.length) {
    const setRadioChecked = (showGrid: boolean): void => {
      for (const r of gridRadios) {
        r.checked = (r.value === 'yes') === showGrid;
      }
    };
    setRadioChecked(initial.showGrid);
    for (const r of gridRadios) {
      r.addEventListener('change', () => {
        if (!r.checked) return;
        updateSettings({ showGrid: r.value === 'yes' });
      });
    }
    subscribeSettings((s) => setRadioChecked(s.showGrid));
  }

  const gridStepSelect = document.querySelector<HTMLSelectElement>(
    'select[data-setting="grid-step"]',
  );
  if (gridStepSelect) {
    gridStepSelect.value = String(initial.gridStep);
    gridStepSelect.addEventListener('change', () => {
      const raw = gridStepSelect.value;
      const next = raw === 'auto' ? 'auto' : Number(raw);
      updateSettings({ gridStep: next });
    });
    subscribeSettings((s) => {
      const v = String(s.gridStep);
      if (gridStepSelect.value !== v) gridStepSelect.value = v;
    });
  }

  const cursorCoordsToggle = document.querySelector<HTMLInputElement>(
    'input[data-setting="show-cursor-coords"]',
  );
  if (cursorCoordsToggle) {
    cursorCoordsToggle.checked = initial.showCursorCoords;
    cursorCoordsToggle.disabled = !initial.showGrid;
    cursorCoordsToggle.addEventListener('change', () => {
      updateSettings({ showCursorCoords: cursorCoordsToggle.checked });
    });
    subscribeSettings((s) => {
      if (cursorCoordsToggle.checked !== s.showCursorCoords)
        cursorCoordsToggle.checked = s.showCursorCoords;
      if (cursorCoordsToggle.disabled !== !s.showGrid) cursorCoordsToggle.disabled = !s.showGrid;
    });
  }
}
