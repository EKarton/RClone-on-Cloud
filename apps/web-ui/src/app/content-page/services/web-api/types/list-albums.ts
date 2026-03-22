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
