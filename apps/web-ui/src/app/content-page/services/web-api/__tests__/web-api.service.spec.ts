import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { toSuccess } from '../../../../shared/results/results';
import { GetAlbumDetailsResponse } from '../types/album';
import { GetGPhotosMediaItemDetailsResponse } from '../types/gphotos-media-item';
import { GetHeatmapRequest, Heatmap } from '../types/heatmap';
import {
  ListAlbumsRequest,
  ListAlbumsResponse,
  ListAlbumsSortByFields,
  ListAlbumsSortDirection,
} from '../types/list-albums';
import { ListMediaItemsResponse } from '../types/list-media-items';
import { ListMediaItemsRequest } from '../types/list-media-items';
import { ListMediaItemsSortDirection } from '../types/list-media-items';
import { ListMediaItemsSortByFields } from '../types/list-media-items';
import { SampleMediaItemsResponse } from '../types/sample-media-items';
import { SampleMediaItemsRequest } from '../types/sample-media-items';
import { WebApiService } from '../web-api.service';

describe('WebApiService', () => {
  let service: WebApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WebApiService,
      ],
    });
    service = TestBed.inject(WebApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAlbum()', () => {
    it('should fetch album details', () => {
      const albumId = 'album123';
      const mockResponse: GetAlbumDetailsResponse = {
        id: albumId,
        albumName: 'Test Album',
        numChildAlbums: 0,
        numMediaItems: 2,
      };

      service.getAlbum('authToken123', albumId).subscribe((response) => {
        expect(response).toEqual(toSuccess(mockResponse));
      });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/albums/${albumId}`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toEqual(
        'Bearer authToken123',
      );
      req.flush(mockResponse);
    });
  });

  describe('getMediaItem()', () => {
    it('should fetch media item details', () => {
      const mediaItemId = 'media123';
      const mockResponse = {
        id: mediaItemId,
        fileName: 'test.jpg',
        hashCode: 'abc123',
        gPhotosMediaItemId: 'client1:gphoto123',
        width: 200,
        height: 300,
        dateTaken: '2024-05-27T13:17:46.000Z',
        mimeType: 'image/jpeg',
      };

      service
        .getMediaItem('authToken123', mediaItemId)
        .subscribe((response) => {
          expect(response).toEqual(
            toSuccess({
              id: mediaItemId,
              fileName: 'test.jpg',
              hashCode: 'abc123',
              gPhotosMediaItemId: 'client1:gphoto123',
              location: undefined,
              width: 200,
              height: 300,
              dateTaken: new Date('2024-05-27T13:17:46.000Z'),
              mimeType: 'image/jpeg',
            }),
          );
        });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/media-items/${mediaItemId}`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toEqual(
        'Bearer authToken123',
      );
      req.flush(mockResponse);
    });
  });

  describe('getGPhotosMediaItem', () => {
    it('should fetch GPhotos media item details', () => {
      const gPhotosMediaItemId = 'client1:gphoto123';
      const mockResponse: GetGPhotosMediaItemDetailsResponse = {
        baseUrl: 'https://example.com/media-item.jpg',
        mimeType: 'image/jpeg',
        mediaMetadata: {
          creationTime: '2025-01-01T00:00:00Z',
          width: '1920',
          height: '1080',
          photo: {
            cameraMake: 'Canon',
            cameraModel: 'EOS 5D Mark IV',
            focalLength: 50,
            apertureFNumber: 1.4,
            isoEquivalent: 800,
            exposureTime: '1/500s',
          },
        },
      };

      service
        .getGPhotosMediaItem('authToken123', { gPhotosMediaItemId })
        .subscribe((response) => {
          expect(response).toEqual(toSuccess(mockResponse));
        });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/storage/gphotos/media-items/${gPhotosMediaItemId}`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toEqual(
        'Bearer authToken123',
      );
      req.flush(mockResponse);
    });
  });

  describe('listMediaItems', () => {
    const accessToken = 'fake-token';

    it('should make a GET request to fetch media items with basic request', () => {
      const request: ListMediaItemsRequest = {};
      const mockResponse = {
        mediaItems: [
          {
            id: '1',
            fileName: 'photo.jpg',
            hashCode: 'abc',
            gPhotosMediaItemId: 'g1',
            width: 200,
            height: 300,
            dateTaken: '2024-05-27T13:17:46.000Z',
            mimeType: 'image/jpeg',
          },
        ],
        nextPageToken: 'next123',
      };

      service.listMediaItems(accessToken, request).subscribe((response) => {
        expect(response).toEqual(
          toSuccess<ListMediaItemsResponse>({
            mediaItems: [
              {
                id: '1',
                fileName: 'photo.jpg',
                hashCode: 'abc',
                gPhotosMediaItemId: 'g1',
                location: undefined,
                width: 200,
                height: 300,
                dateTaken: new Date('2024-05-27T13:17:46.000Z'),
                mimeType: 'image/jpeg',
              },
            ],
            nextPageToken: 'next123',
          }),
        );
      });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/media-items/search`,
      );

      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${accessToken}`,
      );
      expect(req.request.params.keys()).toEqual([]);

      req.flush(mockResponse);
    });

    it('should include query params when provided', () => {
      const earliestDateTaken = new Date(2025, 4, 2);
      const latestDateTaken = new Date(2025, 4, 2);
      const request: ListMediaItemsRequest = {
        albumId: 'album123',
        earliestDateTaken,
        latestDateTaken,
        locationRange: {
          latitude: -49,
          longitude: 90,
          range: 100,
        },
        pageSize: 10,
        pageToken: 'page123',
        sortBy: {
          field: ListMediaItemsSortByFields.ID,
          direction: ListMediaItemsSortDirection.DESCENDING,
        },
      };

      const mockResponse = { mediaItems: [], nextPageToken: undefined };

      service.listMediaItems(accessToken, request).subscribe((response) => {
        expect(response).toEqual(toSuccess(mockResponse));
      });

      const req = httpMock.expectOne((req) => {
        return (
          req.url ===
            `${environment.webApiEndpoint}/api/v1/media-items/search` &&
          req.params.get('albumId') === 'album123' &&
          req.params.get('pageSize') === '10' &&
          req.params.get('pageToken') === 'page123' &&
          req.params.get('sortBy') === 'id' &&
          req.params.get('sortDir') === 'desc' &&
          req.params.get('earliest') === earliestDateTaken.toISOString() &&
          req.params.get('latest') === latestDateTaken.toISOString() &&
          req.params.get('latitude') === '-49' &&
          req.params.get('longitude') === '90' &&
          req.params.get('range') === '100'
        );
      });

      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${accessToken}`,
      );

      req.flush(mockResponse);
    });
  });

  describe('sampleMediaItems', () => {
    const accessToken = 'fake-token';

    it('should make a GET request to sample media items with minimal request', () => {
      const request: SampleMediaItemsRequest = {};
      const mockResponse = {
        mediaItems: [
          {
            id: '1',
            fileName: 'sample.jpg',
            hashCode: 'xyz',
            gPhotosMediaItemId: 'g1',
            width: 100,
            height: 200,
            dateTaken: '2024-06-01T10:00:00.000Z',
            mimeType: 'image/jpeg',
          },
        ],
      };

      service.sampleMediaItems(accessToken, request).subscribe((response) => {
        expect(response).toEqual(
          toSuccess<SampleMediaItemsResponse>({
            mediaItems: [
              {
                id: '1',
                fileName: 'sample.jpg',
                hashCode: 'xyz',
                gPhotosMediaItemId: 'g1',
                location: undefined,
                width: 100,
                height: 200,
                dateTaken: new Date('2024-06-01T10:00:00.000Z'),
                mimeType: 'image/jpeg',
              },
            ],
          }),
        );
      });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/media-items/sample`,
      );

      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${accessToken}`,
      );
      expect(req.request.params.keys()).toEqual([]);

      req.flush(mockResponse);
    });

    it('should include query params when provided', () => {
      const earliestDate = new Date('2025-05-01');
      const latestDate = new Date('2025-05-02');
      const request: SampleMediaItemsRequest = {
        albumId: 'album123',
        earliestDateTaken: earliestDate,
        latestDateTaken: latestDate,
        locationRange: { latitude: 10, longitude: 20, range: 50 },
        pageSize: 5,
      };

      const mockResponse = { mediaItems: [] };

      service.sampleMediaItems(accessToken, request).subscribe((response) => {
        expect(response).toEqual(toSuccess(mockResponse));
      });

      const req = httpMock.expectOne((req) => {
        return (
          req.url ===
            `${environment.webApiEndpoint}/api/v1/media-items/sample` &&
          req.params.get('albumId') === 'album123' &&
          req.params.get('earliest') === earliestDate.toISOString() &&
          req.params.get('latest') === latestDate.toISOString() &&
          req.params.get('latitude') === '10' &&
          req.params.get('longitude') === '20' &&
          req.params.get('range') === '50' &&
          req.params.get('pageSize') === '5'
        );
      });

      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('listAlbums', () => {
    const accessToken = 'fake-token';

    it('should make a GET request to fetch albums with no query params', () => {
      const request = {};
      const mockResponse: ListAlbumsResponse = {
        albums: [],
        nextPageToken: undefined,
      };

      service.listAlbums(accessToken, request).subscribe((response) => {
        expect(response).toEqual(toSuccess(mockResponse));
      });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/albums`,
      );

      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${accessToken}`,
      );
      expect(req.request.params.keys()).toEqual([]);

      req.flush(mockResponse);
    });

    it('should include query params when provided', () => {
      const request: ListAlbumsRequest = {
        parentAlbumId: 'parent123',
        pageSize: 5,
        pageToken: 'page456',
        sortBy: {
          field: ListAlbumsSortByFields.ID,
          direction: ListAlbumsSortDirection.ASCENDING,
        },
      };

      const mockResponse = {
        albums: [
          {
            id: 'a1',
            albumName: 'A',
            numChildAlbums: 0,
            numMediaItems: 1,
          },
        ],
        nextPageToken: 'next789',
      };

      service.listAlbums(accessToken, request).subscribe((response) => {
        expect(response).toEqual(toSuccess(mockResponse));
      });

      const req = httpMock.expectOne((req) => {
        return (
          req.url === `${environment.webApiEndpoint}/api/v1/albums` &&
          req.params.get('parentAlbumId') === 'parent123' &&
          req.params.get('pageSize') === '5' &&
          req.params.get('pageToken') === 'page456' &&
          req.params.get('sortBy') === 'id' &&
          req.params.get('sortDir') === 'asc'
        );
      });

      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${accessToken}`,
      );

      req.flush(mockResponse);
    });
  });

  describe('getHeatmap', () => {
    const accessToken = 'fake-token';
    const heatmap: Heatmap = {
      points: [
        {
          count: 1,
          latitude: -79,
          longitude: 80,
          sampledMediaItemId: 'client1:photos1',
        },
        {
          count: 3,
          latitude: -79,
          longitude: 80.1,
          sampledMediaItemId: 'client1:photos2',
        },
      ],
    };

    it('should make a GET request to fetch heat map with no albumId', () => {
      const request: GetHeatmapRequest = {
        x: 0,
        y: 0,
        z: 1,
      };
      service.getHeatmap(accessToken, request).subscribe((response) => {
        expect(response).toEqual(toSuccess(heatmap));
      });

      const req = httpMock.expectOne((req) => {
        return (
          req.url === `${environment.webApiEndpoint}/api/v1/maps/heatmap` &&
          req.params.get('x') === '0' &&
          req.params.get('y') === '0' &&
          req.params.get('z') === '1'
        );
      });

      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${accessToken}`,
      );

      req.flush(heatmap);
    });

    it('should make a GET request to fetch heat map with albumId', () => {
      const request: GetHeatmapRequest = {
        x: 0,
        y: 0,
        z: 1,
        albumId: 'client1:album1',
      };
      service.getHeatmap(accessToken, request).subscribe((response) => {
        expect(response).toEqual(toSuccess(heatmap));
      });

      const req = httpMock.expectOne((req) => {
        return (
          req.url === `${environment.webApiEndpoint}/api/v1/maps/heatmap` &&
          req.params.get('x') === '0' &&
          req.params.get('y') === '0' &&
          req.params.get('z') === '1' &&
          req.params.get('albumId') === 'client1:album1'
        );
      });

      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${accessToken}`,
      );

      req.flush(heatmap);
    });
  });

  describe('searchMediaItemsByText', () => {
    const accessToken = 'fake-token';

    it('should make a POST request to search media items with minimal body', () => {
      const request = {
        queryEmbedding: new Float32Array([1, 2, 3]),
      };
      const mockResponse = {
        mediaItems: [
          {
            id: '1',
            fileName: 'beach.jpg',
            hashCode: 'abc',
            gPhotosMediaItemId: 'g1',
            width: 1920,
            height: 1080,
            dateTaken: '2024-05-27T13:17:46.000Z',
            mimeType: 'image/jpeg',
          },
        ],
      };

      service
        .vectorSearchMediaItems(accessToken, request)
        .subscribe((response) => {
          expect(response).toEqual(
            toSuccess({
              mediaItems: [
                {
                  id: '1',
                  fileName: 'beach.jpg',
                  hashCode: 'abc',
                  gPhotosMediaItemId: 'g1',
                  location: undefined,
                  width: 1920,
                  height: 1080,
                  dateTaken: new Date('2024-05-27T13:17:46.000Z'),
                  mimeType: 'image/jpeg',
                },
              ],
            }),
          );
        });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/media-items/vector-search`,
      );

      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${accessToken}`,
      );
      expect(req.request.body).toEqual({
        queryEmbedding: [1, 2, 3],
        earliestDateTaken: undefined,
        latestDateTaken: undefined,
        withinMediaItemIds: undefined,
        topK: undefined,
      });

      req.flush(mockResponse);
    });

    it('should include all fields in the POST body when provided', () => {
      const earliestDate = new Date('2023-01-01');
      const latestDate = new Date('2023-12-31');
      const withinMediaItemIds = ['id1', 'id2'];
      const request = {
        queryEmbedding: new Float32Array([1, 2, 3]),
        earliestDateTaken: earliestDate,
        latestDateTaken: latestDate,
        withinMediaItemIds,
        topK: 50,
      };

      const mockResponse = {
        mediaItems: [],
      };

      service
        .vectorSearchMediaItems(accessToken, request)
        .subscribe((response) => {
          expect(response).toEqual(toSuccess(mockResponse));
        });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/media-items/vector-search`,
      );

      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${accessToken}`,
      );
      expect(req.request.body).toEqual({
        queryEmbedding: [1, 2, 3],
        earliestDateTaken: earliestDate.toISOString(),
        latestDateTaken: latestDate.toISOString(),
        withinMediaItemIds: withinMediaItemIds.join(','),
        topK: 50,
      });

      req.flush(mockResponse);
    });
  });

  describe('bulkGetMediaItemsByIds', () => {
    const accessToken = 'fake-token';

    it('should make a POST request and map media items correctly', () => {
      const request = {
        mediaItemIds: ['1', '2'],
      };

      const mockResponse = {
        mediaItems: [
          {
            id: '1',
            fileName: 'photo1.jpg',
            hashCode: 'abc1',
            gPhotosMediaItemId: 'g1',
            width: 100,
            height: 200,
            dateTaken: '2024-01-01T00:00:00.000Z',
            mimeType: 'image/jpeg',
          },
          {
            id: '2',
            fileName: 'photo2.jpg',
            hashCode: 'abc2',
            gPhotosMediaItemId: 'g2',
            width: 300,
            height: 400,
            dateTaken: '2024-02-01T00:00:00.000Z',
            mimeType: 'image/jpeg',
          },
        ],
      };

      service
        .bulkGetMediaItemsByIds(accessToken, request)
        .subscribe((response) => {
          expect(response).toEqual(
            toSuccess({
              mediaItems: [
                {
                  id: '1',
                  fileName: 'photo1.jpg',
                  hashCode: 'abc1',
                  gPhotosMediaItemId: 'g1',
                  location: undefined,
                  width: 100,
                  height: 200,
                  dateTaken: new Date('2024-01-01T00:00:00.000Z'),
                  mimeType: 'image/jpeg',
                },
                {
                  id: '2',
                  fileName: 'photo2.jpg',
                  hashCode: 'abc2',
                  gPhotosMediaItemId: 'g2',
                  location: undefined,
                  width: 300,
                  height: 400,
                  dateTaken: new Date('2024-02-01T00:00:00.000Z'),
                  mimeType: 'image/jpeg',
                },
              ],
            }),
          );
        });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/media-items/bulk-get`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${accessToken}`,
      );
      expect(req.request.body).toEqual(request);

      req.flush(mockResponse);
    });

    it('should handle empty mediaItemIds array', () => {
      const request = { mediaItemIds: [] };
      const mockResponse = { mediaItems: [] };

      service
        .bulkGetMediaItemsByIds(accessToken, request)
        .subscribe((response) => {
          expect(response).toEqual(toSuccess({ mediaItems: [] }));
        });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/media-items/bulk-get`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(
        `Bearer ${accessToken}`,
      );
      expect(req.request.body).toEqual(request);

      req.flush(mockResponse);
    });
  });
});
