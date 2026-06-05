import {
  getState as getMarkersState,
  selectMarker,
  setMode as setMarkersMode,
  subscribe as subscribeMarkers,
} from './markers-store';
import {
  getState as getZonesState,
  selectZone,
  setMode as setZonesMode,
  subscribe as subscribeZones,
} from './zones-store';
import {
  getState as getLinesState,
  selectLine,
  setMode as setLinesMode,
  subscribe as subscribeLines,
} from './lines-store';
import {
  getState as getTextsState,
  selectText,
  setMode as setTextsMode,
  subscribe as subscribeTexts,
} from './texts-store';

type Active = 'markers' | 'zones' | 'lines' | 'texts';

const panelForStore: Record<Active, string> = {
  markers: 'panel-markers',
  zones: 'panel-zones',
  lines: 'panel-lines',
  texts: 'panel-texts',
};

function openEditPanel(active: Active): void {
  document.dispatchEvent(
    new CustomEvent('ops-map:open-panel', {
      detail: { panel: panelForStore[active] },
    }),
  );
}

function clearOthersForSelect(active: Active): void {
  if (active !== 'markers' && getMarkersState().selectedId !== null) selectMarker(null);
  if (active !== 'zones' && getZonesState().selectedId !== null) selectZone(null);
  if (active !== 'lines' && getLinesState().selectedId !== null) selectLine(null);
  if (active !== 'texts' && getTextsState().selectedId !== null) selectText(null);
}

function clearOthersForPlacing(active: Active): void {
  if (active !== 'markers') {
    if (getMarkersState().mode === 'placing') setMarkersMode('idle');
    if (getMarkersState().selectedId !== null) selectMarker(null);
  }
  if (active !== 'zones') {
    if (getZonesState().mode === 'placing') setZonesMode('idle');
    if (getZonesState().selectedId !== null) selectZone(null);
  }
  if (active !== 'lines') {
    if (getLinesState().mode === 'placing') setLinesMode('idle');
    if (getLinesState().selectedId !== null) selectLine(null);
  }
  if (active !== 'texts') {
    if (getTextsState().mode === 'placing') setTextsMode('idle');
    if (getTextsState().selectedId !== null) selectText(null);
  }
}

/** Wire mutual-exclusion of selection/placing across the three stores. */
export function initSelectionCoordinator(): void {
  let prevMarkerSel = getMarkersState().selectedId;
  let prevMarkerMode = getMarkersState().mode;
  subscribeMarkers((s) => {
    if (s.selectedId !== prevMarkerSel) {
      prevMarkerSel = s.selectedId;
      if (s.selectedId !== null) {
        clearOthersForSelect('markers');
        openEditPanel('markers');
      }
    }
    if (s.mode !== prevMarkerMode) {
      prevMarkerMode = s.mode;
      if (s.mode === 'placing') clearOthersForPlacing('markers');
    }
  });

  let prevZoneSel = getZonesState().selectedId;
  let prevZoneMode = getZonesState().mode;
  subscribeZones((s) => {
    if (s.selectedId !== prevZoneSel) {
      prevZoneSel = s.selectedId;
      if (s.selectedId !== null) {
        clearOthersForSelect('zones');
        openEditPanel('zones');
      }
    }
    if (s.mode !== prevZoneMode) {
      prevZoneMode = s.mode;
      if (s.mode === 'placing') clearOthersForPlacing('zones');
    }
  });

  let prevLineSel = getLinesState().selectedId;
  let prevLineMode = getLinesState().mode;
  subscribeLines((s) => {
    if (s.selectedId !== prevLineSel) {
      prevLineSel = s.selectedId;
      if (s.selectedId !== null) {
        clearOthersForSelect('lines');
        openEditPanel('lines');
      }
    }
    if (s.mode !== prevLineMode) {
      prevLineMode = s.mode;
      if (s.mode === 'placing') clearOthersForPlacing('lines');
    }
  });

  let prevTextSel = getTextsState().selectedId;
  let prevTextMode = getTextsState().mode;
  subscribeTexts((s) => {
    if (s.selectedId !== prevTextSel) {
      prevTextSel = s.selectedId;
      if (s.selectedId !== null) {
        clearOthersForSelect('texts');
        openEditPanel('texts');
      }
    }
    if (s.mode !== prevTextMode) {
      prevTextMode = s.mode;
      if (s.mode === 'placing') clearOthersForPlacing('texts');
    }
  });
}
