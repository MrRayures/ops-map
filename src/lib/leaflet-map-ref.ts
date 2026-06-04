import type L from 'leaflet';

let cachedMap: L.Map | null = null;
const pending: Array<(map: L.Map) => void> = [];

export function setLeafletMap(map: L.Map): void {
  cachedMap = map;
  for (const cb of pending) cb(map);
  pending.length = 0;
}

export function whenMapReady(cb: (map: L.Map) => void): void {
  if (cachedMap) {
    cb(cachedMap);
    return;
  }
  pending.push(cb);
}
