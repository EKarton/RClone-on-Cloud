import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../../../auth/store';
import {
  toFailure,
  toPending,
  toSuccess,
} from '../../../../../../shared/results/results';
import {
  GetGPhotosMediaItemDetailsResponse,
  GPhotosMediaItem,
} from '../../../../../services/web-api/types/gphotos-media-item';
import {
  MediaItem,
  MediaItemDetailsApiResponse,
} from '../../../../../services/web-api/types/media-item';
import { WebApiService } from '../../../../../services/web-api/web-api.service';
import { ImageMapMarkerStore, INITIAL_STATE } from '../image-map-marker.store';

const MEDIA_ITEM_ID = 'client1:photos1';

const GPHOTOS_MEDIA_ITEM_ID = 'gPhotosClient1:gPhotosMediaItem1';

const MEDIA_ITEM: MediaItem = {
  id: MEDIA_ITEM_ID,
  fileName: 'cat.png',
  hashCode: '',
  gPhotosMediaItemId: GPHOTOS_MEDIA_ITEM_ID,
  width: 200,
  height: 300,
  location: {
    latitude: -79,
    longitude: 80,
  },
  dateTaken: new Date('2024-05-27T13:17:46.000Z'),
  mimeType: 'image/png',
};

const GPHOTOS_MEDIA_ITEM: GPhotosMediaItem = {
  baseUrl: 'http://www.google.com/photos/1',
  mimeType: 'image/png',
  mediaMetadata: {
    creationTime: '',
    width: '4032',
    height: '3024',
  },
};

describe('ImageStore', () => {
  let store: ImageMapMarkerStore;
  let webApiService: jasmine.SpyObj<WebApiService>;

  const fakeAuthToken = 'auth-token';

  beforeEach(() => {
    const webApiServiceSpy = jasmine.createSpyObj('WebApiService', [
      'getMediaItem',
      'getGPhotosMediaItem',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ImageMapMarkerStore,
        provideMockStore({
          selectors: [
            {
              selector: authState.selectAuthToken,
              value: fakeAuthToken,
            },
          ],
        }),
        { provide: WebApiService, useValue: webApiServiceSpy },
      ],
    });

    store = TestBed.inject(ImageMapMarkerStore);
    webApiService = TestBed.inject(
      WebApiService,
    ) as jasmine.SpyObj<WebApiService>;
  });

  it('should initialize with pending state', () => {
    webApiService.getMediaItem.and.returnValue(
      of(toPending<MediaItemDetailsApiResponse>()),
    );
    webApiService.getGPhotosMediaItem.and.returnValue(
      of(toPending<GetGPhotosMediaItemDetailsResponse>()),
    );

    expect(store.gPhotosMediaItem()).toEqual(INITIAL_STATE.gPhotosMediaItem);
  });

  it('should load and update state on success', () => {
    webApiService.getMediaItem.and.returnValue(of(toSuccess(MEDIA_ITEM)));
    webApiService.getGPhotosMediaItem.and.returnValue(
      of(toSuccess(GPHOTOS_MEDIA_ITEM)),
    );

    store.loadGPhotosMediaItem(MEDIA_ITEM_ID);

    expect(webApiService.getMediaItem).toHaveBeenCalledWith(
      fakeAuthToken,
      MEDIA_ITEM_ID,
    );
    expect(webApiService.getGPhotosMediaItem).toHaveBeenCalledWith(
      fakeAuthToken,
      { gPhotosMediaItemId: GPHOTOS_MEDIA_ITEM_ID },
    );
    expect(store.gPhotosMediaItem()).toEqual(toSuccess(GPHOTOS_MEDIA_ITEM));
  });

  it('should update state to failure on API error', () => {
    const error = new Error('API failed');
    webApiService.getMediaItem.and.returnValue(of(toSuccess(MEDIA_ITEM)));
    webApiService.getGPhotosMediaItem.and.returnValue(
      of(toFailure<GetGPhotosMediaItemDetailsResponse>(error)),
    );

    store.loadGPhotosMediaItem(MEDIA_ITEM_ID);

    expect(store.gPhotosMediaItem()).toEqual(toFailure(error));
  });
});
