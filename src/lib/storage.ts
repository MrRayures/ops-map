// src/lib/storage.ts

import {
  MARKER_COLORS,
  MARKER_ICONS,
  MARKER_SHAPES,
  type Marker,
  type MarkerColor,
  type MarkerIconId,
  type MarkerShape,
} from '../data/markers';
import type { Zone } from '../data/zones';
import type { TextItem } from '../data/texts';
import { DEFAULT_SETTINGS, type SettingsState } from '../data/settings';

declare global {
  interface Window {
    __opsMapBoot?: {
      view: { center: [number, number]; zoom: number };
      restored: boolean;
    };
  }
}

const STORAGE_KEY = 'ops-map:state';
export const SCHEMA_VERSION = 8;

export interface PersistedState {
  version: 8;
  savedAt: string;
  title: string;
  terrain: string;
  view: {
    center: [number, number];
    zoom: number;
  };
  markers: Marker[];
  zones: Zone[];
  texts: TextItem[];
  settings: SettingsState;
}

function isLatLng(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

function isMarker(value: unknown): value is Marker {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  if (typeof m.id !== 'string') return false;
  if (typeof m.lat !== 'number' || typeof m.lng !== 'number') return false;
  if (!MARKER_SHAPES.includes(m.shape as MarkerShape)) return false;
  if (!MARKER_COLORS.includes(m.color as MarkerColor)) return false;
  if (typeof m.content !== 'object' || m.content === null) return false;
  const content = m.content as Record<string, unknown>;
  if (content.kind === 'text') {
    if (typeof content.value !== 'string') return false;
  } else if (content.kind === 'icon') {
    if (!MARKER_ICONS.includes(content.value as MarkerIconId)) return false;
  } else {
    return false;
  }
  if (m.label !== undefined && typeof m.label !== 'string') return false;
  return true;
}

function isZone(value: unknown): value is Zone {
  if (typeof value !== 'object' || value === null) return false;
  const z = value as Record<string, unknown>;
  if (typeof z.id !== 'string') return false;
  if (!Array.isArray(z.points) || z.points.length < 3) return false;
  if (!z.points.every(isLatLng)) return false;
  if (!MARKER_COLORS.includes(z.color as MarkerColor)) return false;
  if (z.label !== undefined && typeof z.label !== 'string') return false;
  if (typeof z.isPlayArea !== 'boolean') return false;
  return true;
}

function isText(value: unknown): value is TextItem {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  if (typeof t.id !== 'string') return false;
  if (typeof t.lat !== 'number' || typeof t.lng !== 'number') return false;
  if (typeof t.value !== 'string') return false;
  if (!MARKER_COLORS.includes(t.backgroundColor as MarkerColor)) return false;
  return true;
}

function isSettings(value: unknown): value is SettingsState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.showGrid !== 'boolean') return false;
  if (s.gridStep !== 'auto' && typeof s.gridStep !== 'number') return false;
  if (typeof s.showCursorCoords !== 'boolean') return false;
  return true;
}

function isValidState(raw: unknown): raw is PersistedState {
  if (typeof raw !== 'object' || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== SCHEMA_VERSION) return false;
  if (typeof obj.savedAt !== 'string') return false;
  if (typeof obj.title !== 'string') return false;
  if (typeof obj.terrain !== 'string') return false;
  if (typeof obj.view !== 'object' || obj.view === null) return false;
  const view = obj.view as Record<string, unknown>;
  if (!isLatLng(view.center)) return false;
  if (typeof view.zoom !== 'number') return false;
  if (!Array.isArray(obj.markers)) return false;
  if (!obj.markers.every(isMarker)) return false;
  if (!Array.isArray(obj.zones)) return false;
  if (!obj.zones.every(isZone)) return false;
  if (!Array.isArray(obj.texts)) return false;
  if (!obj.texts.every(isText)) return false;
  if (!isSettings(obj.settings)) return false;
  return true;
}

function migrate(raw: unknown): PersistedState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const version = (raw as { version?: unknown }).version;
  if (version === 1) {
    const upgraded = {
      ...(raw as object),
      version: SCHEMA_VERSION,
      terrain: '',
      markers: [],
      zones: [],
      texts: [],
      settings: { ...DEFAULT_SETTINGS },
    };
    return isValidState(upgraded) ? upgraded : null;
  }
  if (version === 2) {
    const upgraded = {
      ...(raw as object),
      version: SCHEMA_VERSION,
      terrain: '',
      zones: [],
      texts: [],
      settings: { ...DEFAULT_SETTINGS },
    };
    return isValidState(upgraded) ? upgraded : null;
  }
  if (version === 3) {
    const upgraded = {
      ...(raw as object),
      version: SCHEMA_VERSION,
      terrain: '',
      texts: [],
      settings: { ...DEFAULT_SETTINGS },
    };
    return isValidState(upgraded) ? upgraded : null;
  }
  if (version === 4) {
    const upgraded = {
      ...(raw as object),
      version: SCHEMA_VERSION,
      terrain: '',
      settings: { ...DEFAULT_SETTINGS },
    };
    return isValidState(upgraded) ? upgraded : null;
  }
  if (version === 5 || version === 6) {
    const obj = raw as { settings?: object };
    const upgraded = {
      ...(raw as object),
      version: SCHEMA_VERSION,
      terrain: '',
      settings: { ...DEFAULT_SETTINGS, ...(obj.settings ?? {}) },
    };
    return isValidState(upgraded) ? upgraded : null;
  }
  if (version === 7) {
    // v7 → v8: add terrain (default empty)
    const upgraded = {
      ...(raw as object),
      version: SCHEMA_VERSION,
      terrain: '',
    };
    return isValidState(upgraded) ? upgraded : null;
  }
  if (version === SCHEMA_VERSION) {
    return isValidState(raw) ? raw : null;
  }
  // Unknown version → null.
  return null;
}

function load(): PersistedState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('[storage] corrupted state in localStorage, ignoring');
    return null;
  }
  return migrate(parsed);
}

function save(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[storage] write failed', err);
  }
}

let current: PersistedState | null = null;
let saveTimer: number | null = null;
const DEBOUNCE_MS = 300;

export function bootstrap(defaults: PersistedState): {
  state: PersistedState;
  restored: boolean;
} {
  const loaded = load();
  if (loaded) {
    current = loaded;
    return { state: loaded, restored: true };
  }
  current = defaults;
  return { state: defaults, restored: false };
}

export function getCurrent(): PersistedState {
  if (current === null) {
    throw new Error('[storage] getCurrent called before bootstrap');
  }
  return current;
}

export function update(patch: Partial<Omit<PersistedState, 'version'>>): void {
  if (current === null) {
    throw new Error('[storage] update called before bootstrap');
  }
  current = {
    ...current,
    ...patch,
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
  };
  scheduleSave();
}

export function saveNow(): void {
  if (current === null) return;
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  save(current);
}

function scheduleSave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    if (current !== null) save(current);
  }, DEBOUNCE_MS);
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'operation';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function exportToFile(): void {
  if (current === null) {
    throw new Error('[storage] exportToFile called before bootstrap');
  }
  const json = JSON.stringify(current, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ops-map-${slugifyTitle(current.title)}-${todayIso()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFromFile(file: File): Promise<PersistedState> {
  return file.text().then((text) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Fichier invalide');
    }
    const migrated = migrate(parsed);
    if (migrated === null) {
      // Distinguish version mismatch from structural invalid
      const version = (parsed as { version?: unknown } | null)?.version;
      if (version !== undefined && version !== SCHEMA_VERSION) {
        throw new Error('Version non supportée');
      }
      throw new Error('Fichier invalide');
    }
    return migrated;
  });
}
