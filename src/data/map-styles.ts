const stadiaKey = import.meta.env.PUBLIC_STADIA_API_KEY;
const stadiaSuffix = stadiaKey ? `?api_key=${stadiaKey}` : "";

export const mapStyles = [
  {
    id: "classic",
    label: "Classique",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  {
    id: "satellite",
    label: "Satellite",
    url: `https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.jpg${stadiaSuffix}`,
    attribution:
      '&copy; CNES, Airbus DS, PlanetObserver (Copernicus Data) | &copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
  },
  {
    id: "arcgis",
    label: "Satellite (ArcGIS)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    overlayUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
  },
] as const;

export type MapStyleId = (typeof mapStyles)[number]["id"];
export const defaultMapStyle: MapStyleId = "satellite";
