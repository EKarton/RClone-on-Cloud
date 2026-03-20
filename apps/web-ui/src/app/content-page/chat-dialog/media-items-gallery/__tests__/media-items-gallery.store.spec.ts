import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../auth/store';
import {
  toFailure,
  toPending,
  toSuccess,
} from '../../../../shared/results/results';
import {
  BulkGetMediaItemsByIdsRequest,
  BulkGetMediaItemsByIdsResponse,
} from '../../../services/web-api/types/bulk-get-media-items-by-ids';
import { MediaItem } from '../../../services/web-api/types/media-item';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { MediaItemsGalleryStore } from '../media-items-gallery.store';

const fakeToken = 'fake-auth-token';

const mediaItem1: MediaItem = {
  id: '1',
  fileName: 'file1.jpg',
  hashCode: 'hash1',
  location: { latitude: 1, longitude: 2 },
  gPhotosMediaItemId: 'g1',
  width: 100,
  height: 200,
  dateTaken: new Date('2020-01-01'),
  mimeType: 'image/jpeg',
};

const mediaItem2: MediaItem = {
  id: '2',
  fileName: 'file2.jpg',
  hashCode: 'hash2',
  location: { latitude: 3, longitude: 4 },
  gPhotosMediaItemId: 'g2',
  width: 300,
  height: 400,
  dateTaken: new Date('2020-02-02'),
  mimeType: 'image/jpeg',
};

describe('MediaItemsGalleryStore', () => {
  let componentStore: MediaItemsGalleryStore;
  let webApiService: jasmine.SpyObj<WebApiService>;

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('WebApiService', [
      'bulkGetMediaItemsByIds',
    ]);

    TestBed.configureTestingModule({
      providers: [
        MediaItemsGalleryStore,
        provideMockStore({
          selectors: [
            {
              selector: authState.selectAuthToken,
              value: fakeToken,
            },
          ],
        }),
        { provide: WebApiService, useValue: apiSpy },
      ],
    });

    componentStore = TestBed.inject(MediaItemsGalleryStore);
    webApiService = TestBed.inject(
      WebApiService,
    ) as jasmine.SpyObj<WebApiService>;
  });

  it('should initialize with pending mediaItemsResult', () => {
    expect(componentStore.state().mediaItemsResult).toEqual(toPending());
    expect(componentStore.mediaItems()).toEqual([]);
  });

  it('should load media items successfully', (done) => {
    webApiService.bulkGetMediaItemsByIds.and.returnValue(
      of(toSuccess({ mediaItems: [mediaItem1, mediaItem2] })),
    );

    componentStore.loadMediaItems({ mediaItemIds: ['1', '2'] });

    setTimeout(() => {
      const result = componentStore.state().mediaItemsResult;
      expect(result).toEqual(toSuccess<MediaItem[]>([mediaItem1, mediaItem2]));

      const requestArg: BulkGetMediaItemsByIdsRequest = {
        mediaItemIds: ['1', '2'],
      };
      expect(webApiService.bulkGetMediaItemsByIds).toHaveBeenCalledWith(
        fakeToken,
        requestArg,
      );
      expect(componentStore.mediaItems()).toEqual([mediaItem1, mediaItem2]);
      done();
    }, 200);
  });

  it('should handle API failure', (done) => {
    const error = new Error('API error');
    webApiService.bulkGetMediaItemsByIds.and.returnValue(
      of(toFailure<BulkGetMediaItemsByIdsResponse>(error)),
    );

    componentStore.loadMediaItems({ mediaItemIds: ['1'] });

    setTimeout(() => {
      const result = componentStore.state().mediaItemsResult;
      expect(result).toEqual(toFailure(error));
      expect(componentStore.mediaItems()).toEqual([]);
      done();
    }, 200);
  });
});
