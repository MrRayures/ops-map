import { type MarkerColor } from './markers';

export interface Zone {
  id: string;
  points: [number, number][]; // [lat, lng] vertices, length >= 3
  color: MarkerColor;
  label?: string;
  isPlayArea: boolean;
}

export type ZoneDraft = Omit<Zone, 'id' | 'points'>;

export const DEFAULT_ZONE_DRAFT: ZoneDraft = {
  color: 'team-blue',
  label: '',
  isPlayArea: false,
};

export const ZONE_MIN_VERTICES = 3;
