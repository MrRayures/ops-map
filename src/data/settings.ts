export type GridStep = 'auto' | number; // number = step in meters

export const GRID_STEP_PRESETS: readonly { value: GridStep; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 50, label: '50 m' },
  { value: 100, label: '100 m' },
  { value: 200, label: '200 m' },
  { value: 500, label: '500 m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
  { value: 25000, label: '25 km' },
  { value: 50000, label: '50 km' },
  { value: 100000, label: '100 km' },
];

export interface SettingsState {
  showGrid: boolean;
  gridStep: GridStep;
  showCursorCoords: boolean;
}

export const DEFAULT_SETTINGS: SettingsState = {
  showGrid: false,
  gridStep: 'auto',
  showCursorCoords: false,
};
