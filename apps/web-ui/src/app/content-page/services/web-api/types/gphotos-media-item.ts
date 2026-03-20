/**
 * Represents a media item in Google Photos.
 * Follows the data model at:
 * https://developers.google.com/photos/library/reference/rest/v1/mediaItems#MediaItem.
 */
export interface GPhotosMediaItem {
  /** URL to the media item's bytes. */
  baseUrl?: string;
  /** MIME type of the media item. */
  mimeType: string;
  /** Metadata related to the media item. */
  mediaMetadata: GPhotosMediaMetadata;
}

/**
 * Represents the metadata of a media item.
 * Follows the data model at:
 * https://developers.google.com/photos/library/reference/rest/v1/mediaItems#mediametadata.
 */
export interface GPhotosMediaMetadata {
  /**
   * Time when the media item was first created (not when it was uploaded to Google Photos).
   * A timestamp in RFC3339 UTC "Zulu" format, with nanosecond resolution.
   */
  creationTime?: string;
  /** Original width (in pixels) of the media item. May be null if unavailable. */
  width?: string;
  /** Original height (in pixels) of the media item. May be null if unavailable. */
  height?: string;
  /** Photo-specific metadata, if applicable. */
  photo?: GPhotosPhotoMetadata;
  /** Video-specific metadata, if applicable. */
  video?: GPhotosVideoMetadata;
}

/**
 * Represents photo metadata for a media item.
 * Follows the data model at:
 * https://developers.google.com/photos/library/reference/rest/v1/mediaItems#photo.
 */
export interface GPhotosPhotoMetadata {
  /** Brand of the camera with which the photo was taken. */
  cameraMake?: string;
  /** Model of the camera with which the photo was taken. */
  cameraModel?: string;
  /** Focal length of the camera lens used. */
  focalLength?: number;
  /** Aperture f number of the camera lens used. */
  apertureFNumber?: number;
  /** ISO equivalent value of the camera. */
  isoEquivalent?: number;
  /** Exposure time of the camera aperture when the photo was taken (e.g., "3.5s"). */
  exposureTime?: string;
}

/**
 * Metadata specific to a video.
 * Follows the data model at:
 * https://developers.google.com/photos/library/reference/rest/v1/mediaItems#video.
 */
export interface GPhotosVideoMetadata {
  /** Brand of the camera with which the video was taken. */
  cameraMake?: string;
  /** Model of the camera with which the video was taken. */
  cameraModel?: string;
  /** Frame rate of the video. */
  fps?: number;
  /** Processing status of the video. */
  status?: GPhotosVideoProcessingStatus;
}

/**
 * Processing status of a video being uploaded to Google Photos.
 * Follows the data model at:
 * https://developers.google.com/photos/library/reference/rest/v1/mediaItems#videoprocessingstatus.
 */
export enum GPhotosVideoProcessingStatus {
  UNSPECIFIED = 'UNSPECIFIED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

/**
 * Represents the status of an HTTP request.
 * Follows the data model at:
 * https://developers.google.com/photos/library/reference/rest/v1/Status.
 */
export interface Status {
  /** A developer-facing error message in English. */
  message: string;
  /** A list of messages that carry error details. Each tuple contains two strings. */
  details?: [string, string][];
  /** The status code, corresponding to an enum value of google.rpc.Code. */
  code?: number;
}

/** The request type of /api/v1/gphotos/:id/media-items/:media-item-id */
export interface GetGPhotosMediaItemDetailsRequest {
  gPhotosMediaItemId: string;
}

/** The response type of /api/v1/gphotos/:id/media-items/:media-item-id */
export type GetGPhotosMediaItemDetailsResponse = GPhotosMediaItem;
