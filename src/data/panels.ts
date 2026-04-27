export const panels = [
  { id: "address", label: "Adresse" },
  { id: "tools", label: "Outils" },
  { id: "settings", label: "Paramètres" },
] as const;

export type PanelId = (typeof panels)[number]["id"];

export const tabId = (id: PanelId) => `tab-${id}`;
export const panelId = (id: PanelId) => `panel-${id}`;
