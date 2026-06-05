import type { MarkerColor } from './markers';

export const MARKER_COLOR_CLASS: Record<MarkerColor, string> = {
  'team-red': 'bg-team-red',
  'team-blue': 'bg-team-blue',
  'team-green': 'bg-team-green',
  'team-purple': 'bg-team-purple',
  'marker-objective': 'bg-marker-objective',
  'marker-spawn': 'bg-marker-spawn',
  'marker-danger': 'bg-marker-danger',
  'marker-cover': 'bg-marker-cover',
};

export const MARKER_COLOR_LABELS: Record<MarkerColor, string> = {
  'team-red': 'Équipe rouge',
  'team-blue': 'Équipe bleue',
  'team-green': 'Équipe verte',
  'team-purple': 'Équipe violette',
  'marker-objective': 'Objectif',
  'marker-spawn': 'Spawn',
  'marker-danger': 'Danger',
  'marker-cover': 'Couverture',
};
