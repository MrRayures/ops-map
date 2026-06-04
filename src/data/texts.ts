import { type MarkerColor } from './markers';

export interface TextItem {
  id: string;
  lat: number;
  lng: number;
  value: string;
  backgroundColor: MarkerColor;
}

export type TextDraft = Omit<TextItem, 'id' | 'lat' | 'lng'>;

export const DEFAULT_TEXT_DRAFT: TextDraft = {
  value: '',
  backgroundColor: 'team-blue',
};
