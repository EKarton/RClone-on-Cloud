import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../auth/store';
import { toFailure, toSuccess } from '../../../shared/results/results';
import { GetGPhotosMediaItemDetailsResponse } from '../../services/web-api/types/gphotos-media-item';
import { GPhotosMediaItem } from '../../services/web-api/types/gphotos-media-item';
import { MediaItemDetailsApiResponse } from '../../services/web-api/types/media-item';
import { MediaItem } from '../../services/web-api/types/media-item';
import { WebApiService } from '../../services/web-api/web-api.service';
import { INITIAL_STATE, MediaViewerStore } from '../media-viewer.store';

describe('MediaViewerStore', () => {
  let store: MediaViewerStore;
  let webApiService: jasmine.SpyObj<WebApiService>;

  const fakeAuthToken = 'test-token';
  const fakeMediaItemId = 'item-123';
  const fakeMediaItemDetails: MediaItem = {
    id: 'mediaItem1',
    fileName: 'dog.png',
    hashCode: '1234',
    location: {
      latitude: 123,
      longitude: 456,
    },
    gPhotosMediaItemId: 'gPhotosClientId1:gPhotosMediaItem1',
    width: 200,
    height: 300,
    dateTaken: new Date('2024-05-27T13:17:46.000Z'),
    mimeType: 'image/png',
  };

  const fakeGPhotosDetails: GPhotosMediaItem = {
    baseUrl: 'http://www.google.com/photos/1',
    mimeType: 'image/png',
    mediaMetadata: {
      creationTime: '',
      width: '200',
      height: '300',
    },
  };

  beforeEach(() => {
    const webApiSpy = jasmine.createSpyObj('WebApiService', [
      'getMediaItem',
      'getGPhotosMediaItem',
    ]);

    TestBed.configureTestingModule({
      providers: [
        MediaViewerStore,
        provideMockStore({
          selectors: [
            {
              selector: authState.selectAuthToken,
              value: fakeAuthToken,
            },
          ],
        }),
        { provide: WebApiService, useValue: webApiSpy },
      ],
    });

    store = TestBed.inject(MediaViewerStore);
    webApiService = TestBed.inject(
      WebApiService,
    ) as jasmine.SpyObj<WebApiService>;
  });

  it('should initialize with pending states', () => {
    expect(store.mediaItemResult()).toEqual(INITIAL_STATE.mediaItemResult);
    expect(store.gMediaItemResult()).toEqual(INITIAL_STATE.gMediaItemResult);
  });

  it('should load media and gPhotos item details successfully', () => {
    webApiService.getMediaItem.and.returnValue(
      of(toSuccess(fakeMediaItemDetails)),
    );
    webApiService.getGPhotosMediaItem.and.returnValue(
      of(toSuccess(fakeGPhotosDetails)),
    );

    store.loadDetails(fakeMediaItemId);

    expect(store.mediaItemResult()).toEqual(toSuccess(fakeMediaItemDetails));
    expect(store.gMediaItemResult()).toEqual(toSuccess(fakeGPhotosDetails));
    expect(webApiService.getMediaItem).toHaveBeenCalledWith(
      fakeAuthToken,
      fakeMediaItemId,
    );
    expect(webApiService.getGPhotosMediaItem).toHaveBeenCalledWith(
      fakeAuthToken,
      { gPhotosMediaItemId: 'gPhotosClientId1:gPhotosMediaItem1' },
    );
  });

  it('should handle error when first API call throws an error', () => {
    const error = new Error('API fail');
    webApiService.getMediaItem.and.returnValue(
      of(toFailure<MediaItemDetailsApiResponse>(error)),
    );

    store.loadDetails(fakeMediaItemId);

    expect(store.mediaItemResult()).toEqual(toFailure(error));
    expect(store.gMediaItemResult()).toEqual(INITIAL_STATE.gMediaItemResult);
  });

  it('should handle error when second API call throws an error', () => {
    const error = new Error('gPhotos fail');
    webApiService.getMediaItem.and.returnValue(
      of(toSuccess(fakeMediaItemDetails)),
    );
    webApiService.getGPhotosMediaItem.and.returnValue(
      of(toFailure<GetGPhotosMediaItemDetailsResponse>(error)),
    );

    store.loadDetails(fakeMediaItemId);

    expect(store.mediaItemResult()).toEqual(toSuccess(fakeMediaItemDetails));
    expect(store.gMediaItemResult()).toEqual(toFailure(error));
  });
});
