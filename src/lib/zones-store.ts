import { DEFAULT_ZONE_DRAFT, type Zone, type ZoneDraft } from '../data/zones';

export type ZoneMode = 'idle' | 'placing';

export interface ZonesState {
  readonly zones: readonly Zone[];
  readonly selectedId: string | null;
  readonly mode: ZoneMode;
  readonly draft: ZoneDraft;
  readonly draftPoints: readonly [number, number][];
}

type Listener = (state: ZonesState) => void;

const listeners = new Set<Listener>();

let state: ZonesState = {
  zones: [],
  selectedId: null,
  mode: 'idle',
  draft: { ...DEFAULT_ZONE_DRAFT },
  draftPoints: [],
};

function emit(): void {
  for (const listener of listeners) listener(state);
}

function setState(patch: Partial<ZonesState>): void {
  state = { ...state, ...patch };
  emit();
}

export function getState(): ZonesState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hydrate(zones: readonly Zone[]): void {
  setState({
    zones: [...zones],
    selectedId: null,
    mode: 'idle',
    draft: { ...DEFAULT_ZONE_DRAFT },
    draftPoints: [],
  });
}

export function setMode(mode: ZoneMode): void {
  if (state.mode === mode) return;
  if (mode === 'idle') {
    setState({ mode, draftPoints: [] });
  } else {
    setState({ mode, draftPoints: [], selectedId: null });
  }
}

export function updateDraft(patch: Partial<ZoneDraft>): void {
  setState({ draft: { ...state.draft, ...patch } });
}

export function addDraftPoint(lat: number, lng: number): void {
  if (state.mode !== 'placing') return;
  setState({ draftPoints: [...state.draftPoints, [lat, lng]] });
}

function applyPlayAreaUniqueness(zones: Zone[], modifiedId: string): Zone[] {
  const modified = zones.find((z) => z.id === modifiedId);
  if (!modified || !modified.isPlayArea) return zones;
  return zones.map((z) => (z.id !== modifiedId && z.isPlayArea ? { ...z, isPlayArea: false } : z));
}

export function finishDraft(): Zone | null {
  if (state.mode !== 'placing') return null;
  if (state.draftPoints.length < 3) return null;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `z-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const zone: Zone = {
    id,
    points: state.draftPoints.map((p) => [p[0], p[1]]),
    ...state.draft,
  };
  let nextZones = [...state.zones, zone];
  nextZones = applyPlayAreaUniqueness(nextZones, id);
  setState({
    zones: nextZones,
    selectedId: id,
    mode: 'idle',
    draftPoints: [],
  });
  return zone;
}

export function selectZone(id: string | null): void {
  if (state.selectedId === id) return;
  setState({ selectedId: id });
}

export function updateSelected(patch: Partial<ZoneDraft>): void {
  if (state.selectedId === null) return;
  let nextZones = state.zones.map((z) => (z.id === state.selectedId ? { ...z, ...patch } : z));
  nextZones = applyPlayAreaUniqueness(nextZones, state.selectedId);
  setState({ zones: nextZones });
}

export function moveSelectedVertex(index: number, lat: number, lng: number): void {
  if (state.selectedId === null) return;
  setState({
    zones: state.zones.map((z) => {
      if (z.id !== state.selectedId) return z;
      const points = z.points.map((p, i) => (i === index ? [lat, lng] : p)) as [number, number][];
      return { ...z, points };
    }),
  });
}

export function insertVertexAfter(index: number, lat: number, lng: number): void {
  if (state.selectedId === null) return;
  setState({
    zones: state.zones.map((z) => {
      if (z.id !== state.selectedId) return z;
      const points: [number, number][] = [...z.points];
      const insertAt = Math.min(Math.max(index + 1, 0), points.length);
      points.splice(insertAt, 0, [lat, lng]);
      return { ...z, points };
    }),
  });
}

export function removeVertex(index: number): void {
  if (state.selectedId === null) return;
  setState({
    zones: state.zones.map((z) => {
      if (z.id !== state.selectedId) return z;
      // Keep the polygon valid (>= 3 vertices).
      if (z.points.length <= 3) return z;
      const points = z.points.filter((_, i) => i !== index) as [number, number][];
      return { ...z, points };
    }),
  });
}

export function deleteSelected(): void {
  if (state.selectedId === null) return;
  setState({
    zones: state.zones.filter((z) => z.id !== state.selectedId),
    selectedId: null,
  });
}
