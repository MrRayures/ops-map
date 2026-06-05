import { DEFAULT_LINE_DRAFT, LINE_MIN_VERTICES, type Line, type LineDraft } from '../data/lines';

export type LineMode = 'idle' | 'placing';

export interface LinesState {
  readonly lines: readonly Line[];
  readonly selectedId: string | null;
  readonly mode: LineMode;
  readonly draft: LineDraft;
  readonly draftPoints: readonly [number, number][];
}

type Listener = (state: LinesState) => void;

const listeners = new Set<Listener>();

let state: LinesState = {
  lines: [],
  selectedId: null,
  mode: 'idle',
  draft: { ...DEFAULT_LINE_DRAFT },
  draftPoints: [],
};

function emit(): void {
  for (const listener of listeners) listener(state);
}

function setState(patch: Partial<LinesState>): void {
  state = { ...state, ...patch };
  emit();
}

export function getState(): LinesState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hydrate(lines: readonly Line[]): void {
  setState({
    lines: [...lines],
    selectedId: null,
    mode: 'idle',
    draft: { ...DEFAULT_LINE_DRAFT },
    draftPoints: [],
  });
}

export function setMode(mode: LineMode): void {
  if (state.mode === mode) return;
  if (mode === 'idle') {
    setState({ mode, draftPoints: [] });
  } else {
    setState({ mode, draftPoints: [], selectedId: null });
  }
}

export function updateDraft(patch: Partial<LineDraft>): void {
  setState({ draft: { ...state.draft, ...patch } });
}

export function addDraftPoint(lat: number, lng: number): void {
  if (state.mode !== 'placing') return;
  setState({ draftPoints: [...state.draftPoints, [lat, lng]] });
}

export function finishDraft(): Line | null {
  if (state.mode !== 'placing') return null;
  if (state.draftPoints.length < LINE_MIN_VERTICES) return null;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const line: Line = {
    id,
    points: state.draftPoints.map((p) => [p[0], p[1]]),
    ...state.draft,
  };
  setState({
    lines: [...state.lines, line],
    selectedId: id,
    mode: 'idle',
    draftPoints: [],
  });
  return line;
}

export function selectLine(id: string | null): void {
  if (state.selectedId === id) return;
  setState({ selectedId: id });
}

export function updateSelected(patch: Partial<LineDraft>): void {
  if (state.selectedId === null) return;
  setState({
    lines: state.lines.map((l) => (l.id === state.selectedId ? { ...l, ...patch } : l)),
  });
}

export function moveSelectedVertex(index: number, lat: number, lng: number): void {
  if (state.selectedId === null) return;
  setState({
    lines: state.lines.map((l) => {
      if (l.id !== state.selectedId) return l;
      const points = l.points.map((p, i) => (i === index ? [lat, lng] : p)) as [number, number][];
      return { ...l, points };
    }),
  });
}

export function insertVertexAfter(index: number, lat: number, lng: number): void {
  if (state.selectedId === null) return;
  setState({
    lines: state.lines.map((l) => {
      if (l.id !== state.selectedId) return l;
      const points: [number, number][] = [...l.points];
      const insertAt = Math.min(Math.max(index + 1, 0), points.length);
      points.splice(insertAt, 0, [lat, lng]);
      return { ...l, points };
    }),
  });
}

export function removeVertex(index: number): void {
  if (state.selectedId === null) return;
  setState({
    lines: state.lines.map((l) => {
      if (l.id !== state.selectedId) return l;
      // Keep the polyline valid (>= 2 vertices).
      if (l.points.length <= LINE_MIN_VERTICES) return l;
      const points = l.points.filter((_, i) => i !== index) as [number, number][];
      return { ...l, points };
    }),
  });
}

export function deleteSelected(): void {
  if (state.selectedId === null) return;
  setState({
    lines: state.lines.filter((l) => l.id !== state.selectedId),
    selectedId: null,
  });
}
