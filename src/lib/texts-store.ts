import { DEFAULT_TEXT_DRAFT, type TextDraft, type TextItem } from '../data/texts';

export type TextMode = 'idle' | 'placing';

export interface TextsState {
  readonly texts: readonly TextItem[];
  readonly selectedId: string | null;
  readonly mode: TextMode;
  readonly draft: TextDraft;
}

type Listener = (state: TextsState) => void;

const listeners = new Set<Listener>();

let state: TextsState = {
  texts: [],
  selectedId: null,
  mode: 'idle',
  draft: { ...DEFAULT_TEXT_DRAFT },
};

function emit(): void {
  for (const listener of listeners) listener(state);
}

function setState(patch: Partial<TextsState>): void {
  state = { ...state, ...patch };
  emit();
}

export function getState(): TextsState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hydrate(texts: readonly TextItem[]): void {
  setState({
    texts: [...texts],
    selectedId: null,
    mode: 'idle',
    draft: { ...DEFAULT_TEXT_DRAFT },
  });
}

export function setMode(mode: TextMode): void {
  if (state.mode === mode) return;
  setState({ mode });
}

export function updateDraft(patch: Partial<TextDraft>): void {
  setState({ draft: { ...state.draft, ...patch } });
}

export function createText(lat: number, lng: number, draft: TextDraft): TextItem {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const text: TextItem = { id, lat, lng, ...draft };
  setState({
    texts: [...state.texts, text],
    selectedId: id,
    mode: 'idle',
  });
  return text;
}

export function selectText(id: string | null): void {
  if (state.selectedId === id) return;
  setState({ selectedId: id });
}

export function updateSelected(patch: Partial<TextDraft>): void {
  if (state.selectedId === null) return;
  setState({
    texts: state.texts.map((t) => (t.id === state.selectedId ? { ...t, ...patch } : t)),
  });
}

export function moveSelected(lat: number, lng: number): void {
  if (state.selectedId === null) return;
  setState({
    texts: state.texts.map((t) => (t.id === state.selectedId ? { ...t, lat, lng } : t)),
  });
}

export function deleteSelected(): void {
  if (state.selectedId === null) return;
  setState({
    texts: state.texts.filter((t) => t.id !== state.selectedId),
    selectedId: null,
  });
}
