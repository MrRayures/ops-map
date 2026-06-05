export const panels = [
  { id: 'markers', label: 'Marqueurs', group: 'tools' },
  { id: 'zones', label: 'Zones', group: 'tools' },
  { id: 'lines', label: 'Lignes', group: 'tools' },
  { id: 'texts', label: 'Textes', group: 'tools' },
  { id: 'search', label: 'Recherche', group: 'tools' },
  { id: 'settings', label: 'Paramètres', group: 'settings' },
  { id: 'print', label: 'Impression', group: 'settings' },
] as const;

export type PanelId = (typeof panels)[number]['id'];
export type PanelGroupKey = (typeof panels)[number]['group'];

export const tabId = (id: PanelId) => `tab-${id}`;
export const panelId = (id: PanelId) => `panel-${id}`;
