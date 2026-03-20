import { MediaItem, RawMediaItem } from './media-item';

export interface VectorSearchMediaItemsRequest {
  queryEmbedding: Float32Array;
  earliestDateTaken?: Date;
  latestDateTaken?: Date;
  withinMediaItemIds?: string[];
  topK?: number;
}

export interface RawVectorSearchMediaItemsResponse {
  mediaItems: RawMediaItem[];
}

export interface VectorSearchMediaItemsResponse {
  mediaItems: MediaItem[];
}
