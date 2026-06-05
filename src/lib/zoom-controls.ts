import { whenMapReady } from './leaflet-map-ref';
import { getState as getZonesState } from './zones-store';

/** Wire the bottom-right zoom-in / zoom-out / zoom-fit buttons. */
export function initZoomControls(showToast: (message: string) => void): void {
  const zoomInBtn = document.querySelector<HTMLButtonElement>('button[data-action="zoom-in"]');
  const zoomOutBtn = document.querySelector<HTMLButtonElement>('button[data-action="zoom-out"]');
  const zoomFitBtn = document.querySelector<HTMLButtonElement>('button[data-action="zoom-fit"]');

  zoomInBtn?.addEventListener('click', () => {
    whenMapReady((map) => map.zoomIn());
  });
  zoomOutBtn?.addEventListener('click', () => {
    whenMapReady((map) => map.zoomOut());
  });
  zoomFitBtn?.addEventListener('click', () => {
    const playArea = getZonesState().zones.find((z) => z.isPlayArea);
    if (!playArea) {
      showToast('Aucune zone de jeu définie');
      return;
    }
    whenMapReady((map) => {
      map.flyToBounds(playArea.points as [number, number][], {
        padding: [40, 40],
        duration: 0.6,
      });
    });
  });
}
