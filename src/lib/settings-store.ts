import { DEFAULT_SETTINGS, type SettingsState } from '../data/settings';

type Listener = (state: SettingsState) => void;

const listeners = new Set<Listener>();
let state: SettingsState = { ...DEFAULT_SETTINGS };

function emit(): void {
  for (const listener of listeners) listener(state);
}

export function getState(): SettingsState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hydrate(next: SettingsState): void {
  state = { ...next };
  emit();
}

export function update(patch: Partial<SettingsState>): void {
  state = { ...state, ...patch };
  emit();
}
