import {
  getState as getPrintState,
  setActive as setPrintActive,
  setOrientation as setPrintOrientation,
  subscribe as subscribePrint,
} from './print-store';

interface PrintControlsDeps {
  /** Current operation title (committed or in-progress). */
  getTitle(): string;
  /** Current terrain name (committed or in-progress). */
  getTerrain(): string;
}

/** Wire the print-preview controls (open, print, exit, orientation, Escape). */
export function initPrintControls({ getTitle, getTerrain }: PrintControlsDeps): void {
  const printFrame = document.querySelector<HTMLElement>('[data-print-frame]');
  const printOpEl = document.querySelector<HTMLElement>('[data-print-op]');
  const printTerrainEl = document.querySelector<HTMLElement>('[data-print-terrain]');
  const openPrintBtn = document.querySelector<HTMLButtonElement>('button[data-action="print"]');
  const printNowBtn = document.querySelector<HTMLButtonElement>('button[data-action="print-now"]');
  const printExitBtn = document.querySelector<HTMLButtonElement>(
    'button[data-action="print-exit"]',
  );
  const orientationRadios = document.querySelectorAll<HTMLInputElement>(
    'input[data-print="orientation"]',
  );

  const syncPrintDom = (): void => {
    const s = getPrintState();
    document.body.dataset.printPreview = String(s.active);
    if (printFrame) printFrame.dataset.orientation = s.orientation;
  };

  const openPrintPreview = (): void => {
    if (printOpEl) printOpEl.textContent = getTitle();
    if (printTerrainEl) printTerrainEl.textContent = getTerrain();
    setPrintActive(true);
  };

  openPrintBtn?.addEventListener('click', openPrintPreview);
  printNowBtn?.addEventListener('click', () => window.print());
  printExitBtn?.addEventListener('click', () => setPrintActive(false));

  for (const radio of orientationRadios) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const value = radio.value;
      if (value === 'landscape' || value === 'portrait') {
        setPrintOrientation(value);
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && getPrintState().active) {
      event.preventDefault();
      setPrintActive(false);
    }
  });

  subscribePrint(syncPrintDom);
  syncPrintDom();
}
