// src/lib/storage.ts

declare global {
  interface Window {
    __opsMapBoot?: {
      view: { center: [number, number]; zoom: number };
      restored: boolean;
    };
  }
}

const STORAGE_KEY = "ops-map:state";
const SCHEMA_VERSION = 1;

export interface PersistedState {
  version: 1;
  savedAt: string;
  title: string;
  view: {
    center: [number, number];
    zoom: number;
  };
}

function isLatLng(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function isValidState(raw: unknown): raw is PersistedState {
  if (typeof raw !== "object" || raw === null) return false;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) return false;
  if (typeof obj.savedAt !== "string") return false;
  if (typeof obj.title !== "string") return false;
  if (typeof obj.view !== "object" || obj.view === null) return false;
  const view = obj.view as Record<string, unknown>;
  if (!isLatLng(view.center)) return false;
  if (typeof view.zoom !== "number") return false;
  return true;
}

function migrate(raw: unknown): PersistedState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const version = (raw as { version?: unknown }).version;
  if (version === SCHEMA_VERSION) {
    return isValidState(raw) ? raw : null;
  }
  // Future versions land here. Unknown version → null.
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
    console.warn("[storage] corrupted state in localStorage, ignoring");
    return null;
  }
  return migrate(parsed);
}

function save(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[storage] write failed", err);
  }
}
