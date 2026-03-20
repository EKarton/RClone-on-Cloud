import { MediaItem, RawMediaItem } from './media-item';

export interface BulkGetMediaItemsByIdsRequest {
  mediaItemIds: string[];
}

export interface RawBulkGetMediaItemsByIdsResponse {
  mediaItems: RawMediaItem[];
}

export interface BulkGetMediaItemsByIdsResponse {
  mediaItems: MediaItem[];
}
