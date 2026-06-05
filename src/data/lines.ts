import { type MarkerColor } from './markers';

export const LINE_STYLES = ['solid', 'dashed', 'dotted'] as const;
export type LineStyle = (typeof LINE_STYLES)[number];

export interface Line {
  id: string;
  points: [number, number][]; // [lat, lng] vertices, length >= 2
  color: MarkerColor;
  style: LineStyle;
}

export type LineDraft = Omit<Line, 'id' | 'points'>;

export const DEFAULT_LINE_DRAFT: LineDraft = {
  color: 'team-blue',
  style: 'solid',
};

export const LINE_MIN_VERTICES = 2;
