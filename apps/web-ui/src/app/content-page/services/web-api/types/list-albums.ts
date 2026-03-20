import { Album } from './album';

export interface ListAlbumsRequest {
  parentAlbumId?: string;
  pageSize?: number;
  pageToken?: string;
  sortBy?: ListAlbumsSortBy;
}

export interface ListAlbumsSortBy {
  field: ListAlbumsSortByFields;
  direction: ListAlbumsSortDirection;
}

export enum ListAlbumsSortByFields {
  ID = 'id',
  NAME = 'name',
}

export enum ListAlbumsSortDirection {
  ASCENDING = 'asc',
  DESCENDING = 'desc',
}

export interface ListAlbumsResponse {
  albums: Album[];
  nextPageToken?: string;
}
