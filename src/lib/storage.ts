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
    throw new Error("[storage] getCurrent called before bootstrap");
  }
  return current;
}

export function update(patch: Partial<Omit<PersistedState, "version">>): void {
  if (current === null) {
    throw new Error("[storage] update called before bootstrap");
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
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "operation";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function exportToFile(): void {
  if (current === null) {
    throw new Error("[storage] exportToFile called before bootstrap");
  }
  const json = JSON.stringify(current, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
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
      throw new Error("Fichier invalide");
    }
    const migrated = migrate(parsed);
    if (migrated === null) {
      // Distinguish version mismatch from structural invalid
      const version = (parsed as { version?: unknown } | null)?.version;
      if (version !== undefined && version !== SCHEMA_VERSION) {
        throw new Error("Version non supportée");
      }
      throw new Error("Fichier invalide");
    }
    return migrated;
  });
}
