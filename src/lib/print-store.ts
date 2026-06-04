export type PrintOrientation = 'landscape' | 'portrait';

export interface PrintState {
  readonly active: boolean;
  readonly orientation: PrintOrientation;
}

type Listener = (state: PrintState) => void;

const listeners = new Set<Listener>();

let state: PrintState = {
  active: false,
  orientation: 'landscape',
};

function emit(): void {
  for (const listener of listeners) listener(state);
}

function setState(patch: Partial<PrintState>): void {
  state = { ...state, ...patch };
  emit();
}

export function getState(): PrintState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setActive(active: boolean): void {
  if (state.active === active) return;
  setState({ active });
}

export function setOrientation(orientation: PrintOrientation): void {
  if (state.orientation === orientation) return;
  setState({ orientation });
}

export function toggle(): void {
  setState({ active: !state.active });
}
