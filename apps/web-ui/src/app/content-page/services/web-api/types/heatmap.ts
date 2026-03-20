/** Represents an entry to the heat map.  */
export interface HeatmapPoints {
  count: number;
  latitude: number;
  longitude: number;
  sampledMediaItemId: string;
}

/** Represents a heat map. */
export interface Heatmap {
  points: HeatmapPoints[];
}

/** Represents the api request to fetch for the heatmap of a tile. */
export interface GetHeatmapRequest {
  x: number;
  y: number;
  z: number;
  albumId?: string | undefined;
}

/** Represents the api response from fetching the heatmap of a tile. */
export type GetHeatmapResponse = Heatmap;
