import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Result } from '../../../shared/results/results';
import { toResult } from '../../../shared/results/rxjs/toResult';
import { GetAlbumDetailsResponse } from './types/album';
import {
  BulkGetMediaItemsByIdsRequest,
  BulkGetMediaItemsByIdsResponse,
} from './types/bulk-get-media-items-by-ids';
import {
  GetGPhotosMediaItemDetailsRequest,
  GetGPhotosMediaItemDetailsResponse,
} from './types/gphotos-media-item';
import { GetHeatmapRequest, GetHeatmapResponse } from './types/heatmap';
import { ListAlbumsRequest, ListAlbumsResponse } from './types/list-albums';
import {
  ListMediaItemsRequest,
  ListMediaItemsResponse,
  RawListMediaItemsResponse,
} from './types/list-media-items';
import {
  MediaItem,
  MediaItemDetailsApiResponse,
  RawMediaItemDetailsApiResponse,
} from './types/media-item';
import { RawMediaItem } from './types/media-item';
import { SampleMediaItemsResponse } from './types/sample-media-items';
import { RawSampleMediaItemsResponse } from './types/sample-media-items';
import { SampleMediaItemsRequest } from './types/sample-media-items';
import {
  RawVectorSearchMediaItemsResponse,
  VectorSearchMediaItemsRequest,
  VectorSearchMediaItemsResponse,
} from './types/search-media-items-by-text';

@Injectable({ providedIn: 'root' })
export class WebApiService {
  private readonly httpClient = inject(HttpClient);

  /** Fetches the details of an album. */
  getAlbum(
    accessToken: string,
    albumId: string,
  ): Observable<Result<GetAlbumDetailsResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/albums/${albumId}`;
    return this.httpClient
      .get<GetAlbumDetailsResponse>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .pipe(toResult());
  }

  /** Fetches the details of a media item. */
  getMediaItem(
    accessToken: string,
    mediaItemId: string,
  ): Observable<Result<MediaItemDetailsApiResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/media-items/${mediaItemId}`;
    return this.httpClient
      .get<RawMediaItemDetailsApiResponse>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .pipe(map(this.convertRawMediaItemToMediaItem), toResult());
  }

  /** Fetches the details of a gphotos media item. */
  getGPhotosMediaItem(
    accessToken: string,
    request: GetGPhotosMediaItemDetailsRequest,
  ): Observable<Result<GetGPhotosMediaItemDetailsResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/storage/gphotos/media-items/${request.gPhotosMediaItemId}`;
    return this.httpClient
      .get<GetGPhotosMediaItemDetailsResponse>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .pipe(toResult());
  }

  /** Lists all the media items in a paginated way. */
  listMediaItems(
    accessToken: string,
    request: ListMediaItemsRequest,
  ): Observable<Result<ListMediaItemsResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/media-items/search`;

    let params = new HttpParams();
    if (request.albumId) {
      params = params.set('albumId', request.albumId);
    }
    if (request.earliestDateTaken) {
      params = params.set('earliest', request.earliestDateTaken.toISOString());
    }
    if (request.latestDateTaken) {
      params = params.set('latest', request.latestDateTaken.toISOString());
    }
    if (request.locationRange) {
      params = params
        .set('latitude', request.locationRange.latitude)
        .set('longitude', request.locationRange.longitude)
        .set('range', request.locationRange.range);
    }
    if (request.pageSize) {
      params = params.set('pageSize', request.pageSize);
    }
    if (request.pageToken) {
      params = params.set('pageToken', request.pageToken);
    }
    if (request.sortBy) {
      params = params.set('sortBy', request.sortBy.field);
      params = params.set('sortDir', request.sortBy.direction);
    }

    return this.httpClient
      .get<RawListMediaItemsResponse>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      })
      .pipe(
        map((res) => ({
          mediaItems: res.mediaItems.map(this.convertRawMediaItemToMediaItem),
          nextPageToken: res.nextPageToken,
        })),
        toResult(),
      );
  }

  sampleMediaItems(
    accessToken: string,
    request: SampleMediaItemsRequest,
  ): Observable<Result<SampleMediaItemsResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/media-items/sample`;

    let params = new HttpParams();
    if (request.albumId) {
      params = params.set('albumId', request.albumId);
    }
    if (request.earliestDateTaken) {
      params = params.set('earliest', request.earliestDateTaken.toISOString());
    }
    if (request.latestDateTaken) {
      params = params.set('latest', request.latestDateTaken.toISOString());
    }
    if (request.locationRange) {
      params = params
        .set('latitude', request.locationRange.latitude)
        .set('longitude', request.locationRange.longitude)
        .set('range', request.locationRange.range);
    }
    if (request.pageSize) {
      params = params.set('pageSize', request.pageSize);
    }

    return this.httpClient
      .get<RawSampleMediaItemsResponse>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      })
      .pipe(
        map((res) => ({
          mediaItems: res.mediaItems.map(this.convertRawMediaItemToMediaItem),
        })),
        toResult(),
      );
  }

  /** List albums in a paginated way. */
  listAlbums(
    accessToken: string,
    request: ListAlbumsRequest,
  ): Observable<Result<ListAlbumsResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/albums`;

    let params = new HttpParams();
    if (request.parentAlbumId) {
      params = params.set('parentAlbumId', request.parentAlbumId);
    }
    if (request.pageSize) {
      params = params.set('pageSize', request.pageSize);
    }
    if (request.pageToken) {
      params = params.set('pageToken', request.pageToken);
    }
    if (request.sortBy) {
      params = params.set('sortBy', request.sortBy.field);
      params = params.set('sortDir', request.sortBy.direction);
    }

    return this.httpClient
      .get<ListAlbumsResponse>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      })
      .pipe(toResult());
  }

  /** Get the heat map of photos within a tile. */
  getHeatmap(
    accessToken: string,
    request: GetHeatmapRequest,
  ): Observable<Result<GetHeatmapResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/maps/heatmap`;

    let params = new HttpParams();
    params = params.set('x', request.x);
    params = params.set('y', request.y);
    params = params.set('z', request.z);

    if (request.albumId) {
      params = params.set('albumId', request.albumId);
    }

    return this.httpClient
      .get<GetHeatmapResponse>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      })
      .pipe(toResult());
  }

  /** Searches for media items by text */
  vectorSearchMediaItems(
    accessToken: string,
    request: VectorSearchMediaItemsRequest,
  ): Observable<Result<VectorSearchMediaItemsResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/media-items/vector-search`;
    const body = {
      queryEmbedding: Array.from(request.queryEmbedding),
      earliestDateTaken: request.earliestDateTaken
        ? request.earliestDateTaken.toISOString()
        : undefined,
      latestDateTaken: request.latestDateTaken
        ? request.latestDateTaken.toISOString()
        : undefined,
      withinMediaItemIds: request.withinMediaItemIds
        ? request.withinMediaItemIds.join(',')
        : undefined,
      topK: request.topK,
    };

    return this.httpClient
      .post<RawVectorSearchMediaItemsResponse>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .pipe(
        map((res) => ({
          mediaItems: res.mediaItems.map(this.convertRawMediaItemToMediaItem),
        })),
        toResult(),
      );
  }

  bulkGetMediaItemsByIds(
    accessToken: string,
    request: BulkGetMediaItemsByIdsRequest,
  ): Observable<Result<BulkGetMediaItemsByIdsResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/media-items/bulk-get`;

    return this.httpClient
      .post<RawListMediaItemsResponse>(url, request, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .pipe(
        map((res) => ({
          mediaItems: res.mediaItems.map(this.convertRawMediaItemToMediaItem),
        })),
        toResult(),
      );
  }

  private convertRawMediaItemToMediaItem(rawDoc: RawMediaItem): MediaItem {
    return {
      id: rawDoc.id,
      fileName: rawDoc.fileName,
      hashCode: rawDoc.hashCode,
      gPhotosMediaItemId: rawDoc.gPhotosMediaItemId,
      location: rawDoc.location,
      width: rawDoc.width,
      height: rawDoc.height,
      dateTaken: new Date(rawDoc.dateTaken),
      mimeType: rawDoc.mimeType,
    };
  }
}
