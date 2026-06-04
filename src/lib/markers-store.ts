import { DEFAULT_MARKER_DRAFT, type Marker, type MarkerDraft } from '../data/markers';

export type MarkerMode = 'idle' | 'placing';

export interface MarkersState {
  readonly markers: readonly Marker[];
  readonly selectedId: string | null;
  readonly mode: MarkerMode;
  readonly draft: MarkerDraft;
}

type Listener = (state: MarkersState) => void;

const listeners = new Set<Listener>();

let state: MarkersState = {
  markers: [],
  selectedId: null,
  mode: 'idle',
  draft: { ...DEFAULT_MARKER_DRAFT },
};

function emit(): void {
  for (const listener of listeners) listener(state);
}

function setState(patch: Partial<MarkersState>): void {
  state = { ...state, ...patch };
  emit();
}

export function getState(): MarkersState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hydrate(markers: readonly Marker[]): void {
  setState({
    markers: [...markers],
    selectedId: null,
    mode: 'idle',
    draft: { ...DEFAULT_MARKER_DRAFT },
  });
}

export function setMode(mode: MarkerMode): void {
  if (state.mode === mode) return;
  setState({ mode });
}

export function updateDraft(patch: Partial<MarkerDraft>): void {
  setState({ draft: { ...state.draft, ...patch } });
}

export function createMarker(lat: number, lng: number, draft: MarkerDraft): Marker {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const marker: Marker = { id, lat, lng, ...draft };
  setState({
    markers: [...state.markers, marker],
    selectedId: id,
    mode: 'idle',
  });
  return marker;
}

export function selectMarker(id: string | null): void {
  if (state.selectedId === id) return;
  setState({ selectedId: id });
}

export function updateSelected(patch: Partial<MarkerDraft>): void {
  if (state.selectedId === null) return;
  setState({
    markers: state.markers.map((m) => (m.id === state.selectedId ? { ...m, ...patch } : m)),
  });
}

export function moveSelected(lat: number, lng: number): void {
  if (state.selectedId === null) return;
  setState({
    markers: state.markers.map((m) => (m.id === state.selectedId ? { ...m, lat, lng } : m)),
  });
}

export function deleteSelected(): void {
  if (state.selectedId === null) return;
  setState({
    markers: state.markers.filter((m) => m.id !== state.selectedId),
    selectedId: null,
  });
}
