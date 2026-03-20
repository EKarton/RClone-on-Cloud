import { MediaItem, RawMediaItem } from './media-item';

export enum ListMediaItemsSortByFields {
  ID = 'id',
  DATE_TAKEN = 'date-taken',
}

export enum ListMediaItemsSortDirection {
  ASCENDING = 'asc',
  DESCENDING = 'desc',
}

export interface ListMediaItemsSortBy {
  field: ListMediaItemsSortByFields;
  direction: ListMediaItemsSortDirection;
}

export interface ListMediaItemsLocationRange {
  latitude: number;
  longitude: number;
  range: number;
}

export interface ListMediaItemsRequest {
  albumId?: string;
  earliestDateTaken?: Date;
  latestDateTaken?: Date;
  locationRange?: ListMediaItemsLocationRange;
  pageSize?: number;
  pageToken?: string;
  sortBy?: ListMediaItemsSortBy;
}

export interface RawListMediaItemsResponse {
  mediaItems: RawMediaItem[];
  nextPageToken?: string;
}

export interface ListMediaItemsResponse {
  mediaItems: MediaItem[];
  nextPageToken?: string;
}
