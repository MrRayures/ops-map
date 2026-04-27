export type MarkerShape = "square" | "triangle" | "circle" | "diamond";

export type MarkerColor =
  | "team-red"
  | "team-blue"
  | "team-green"
  | "team-purple"
  | "marker-objective"
  | "marker-spawn"
  | "marker-danger"
  | "marker-cover";

export type MarkerIconId =
  | "flag"
  | "target"
  | "shield"
  | "eye"
  | "alert-triangle"
  | "swords"
  | "radio"
  | "package";

export type MarkerContent =
  | { kind: "text"; value: string }
  | { kind: "icon"; value: MarkerIconId };

export interface Marker {
  id: string;
  lat: number;
  lng: number;
  shape: MarkerShape;
  color: MarkerColor;
  content: MarkerContent;
  label?: string;
}

export type MarkerDraft = Omit<Marker, "id" | "lat" | "lng">;

export const MARKER_SHAPES: readonly MarkerShape[] = [
  "square",
  "triangle",
  "circle",
  "diamond",
];

export const MARKER_COLORS: readonly MarkerColor[] = [
  "team-red",
  "team-blue",
  "team-green",
  "team-purple",
  "marker-objective",
  "marker-spawn",
  "marker-danger",
  "marker-cover",
];

export const MARKER_ICONS: readonly MarkerIconId[] = [
  "flag",
  "target",
  "shield",
  "eye",
  "alert-triangle",
  "swords",
  "radio",
  "package",
];

export const DEFAULT_MARKER_DRAFT: MarkerDraft = {
  shape: "square",
  color: "team-red",
  content: { kind: "text", value: "" },
  label: "",
};

export const MARKER_TEXT_MAX_LENGTH = 3;
