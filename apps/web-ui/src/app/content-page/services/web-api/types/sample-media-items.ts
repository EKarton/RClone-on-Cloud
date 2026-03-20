import { MediaItem, RawMediaItem } from './media-item';

export interface SampleMediaItemsLocationRange {
  latitude: number;
  longitude: number;
  range: number;
}
export interface SampleMediaItemsRequest {
  albumId?: string;
  earliestDateTaken?: Date;
  latestDateTaken?: Date;
  locationRange?: SampleMediaItemsLocationRange;
  pageSize?: number;
}

export interface RawSampleMediaItemsResponse {
  mediaItems: RawMediaItem[];
}

export interface SampleMediaItemsResponse {
  mediaItems: MediaItem[];
}
