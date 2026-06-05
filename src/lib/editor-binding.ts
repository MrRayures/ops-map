/**
 * Minimal store surface the editor bindings need. Each editor passes an
 * object built from its store's named exports (markers-store, zones-store,
 * texts-store all expose these with compatible shapes).
 */
export interface EditorStore<Patch> {
  getState(): { selectedId: string | null };
  updateSelected(patch: Patch): void;
  updateDraft(patch: Patch): void;
}

/** Apply a patch to the selected item, or to the draft when nothing is selected. */
export function commit<Patch>(store: EditorStore<Patch>, patch: Patch): void {
  if (store.getState().selectedId !== null) store.updateSelected(patch);
  else store.updateDraft(patch);
}

/**
 * Wire a group of color-swatch radios. On click, commits { [key]: value } to
 * the store. `value` comes from each button's data-value attribute.
 */
export function bindColorSwatches<Patch>(
  buttons: Iterable<HTMLButtonElement>,
  store: EditorStore<Patch>,
  key: keyof Patch & string,
): void {
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value as Patch[keyof Patch];
      commit(store, { [key]: value } as Patch);
    });
  }
}

/** Wire a text input. On input, commits { [key]: input.value } to the store. */
export function bindTextField<Patch>(
  input: HTMLInputElement,
  store: EditorStore<Patch>,
  key: keyof Patch & string,
): void {
  input.addEventListener('input', () => {
    commit(store, { [key]: input.value } as Patch);
  });
}

/** Reflect the active color onto swatch buttons via aria-checked. */
export function reflectChecked(buttons: Iterable<HTMLButtonElement>, activeValue: string): void {
  for (const btn of buttons) {
    btn.setAttribute('aria-checked', String(btn.dataset.value === activeValue));
  }
}
