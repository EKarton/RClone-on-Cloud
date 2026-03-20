/** Represents an album. */
export interface Album {
  id: string;
  albumName: string;
  parentAlbumId?: string;
  numMediaItems: number;
  numChildAlbums: number;
}

/** Represents the api response returned from {@code getAlbum()} */
export type GetAlbumDetailsResponse = Album;
