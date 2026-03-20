import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../../auth/store';
import { toFailure, toSuccess } from '../../../../../shared/results/results';
import { GetGPhotosMediaItemDetailsResponse } from '../../../../services/web-api/types/gphotos-media-item';
import { GPhotosMediaItem } from '../../../../services/web-api/types/gphotos-media-item';
import { WebApiService } from '../../../../services/web-api/web-api.service';
import { ImageStore, INITIAL_STATE } from '../image.store';

describe('ImageStore', () => {
  let store: ImageStore;
  let webApiService: jasmine.SpyObj<WebApiService>;

  const fakeAuthToken = 'auth-token';
  const gPhotoId = 'photo-123';
  const gPhotosMediaItem: GPhotosMediaItem = {
    baseUrl: 'http://www.google.com/photos/1',
    mimeType: 'image/jpeg',
    mediaMetadata: {
      creationTime: '',
      width: '4032',
      height: '3024',
    },
  };

  beforeEach(() => {
    const webApiServiceSpy = jasmine.createSpyObj('WebApiService', [
      'getGPhotosMediaItem',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ImageStore,
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

    store = TestBed.inject(ImageStore);
    webApiService = TestBed.inject(
      WebApiService,
    ) as jasmine.SpyObj<WebApiService>;
  });

  it('should initialize with pending state', () => {
    expect(store.gPhotosMediaItem()).toEqual(INITIAL_STATE.gPhotosMediaItem);
  });

  it('should load and update state on success', () => {
    webApiService.getGPhotosMediaItem.and.returnValue(
      of(toSuccess(gPhotosMediaItem)),
    );

    store.loadGPhotosMediaItemDetails(gPhotoId);

    expect(webApiService.getGPhotosMediaItem).toHaveBeenCalledWith(
      fakeAuthToken,
      { gPhotosMediaItemId: gPhotoId },
    );

    const result = store.gPhotosMediaItem();
    expect(result).toEqual(toSuccess(gPhotosMediaItem));
  });

  it('should update state to failure on API error', () => {
    const error = new Error('API failed');
    webApiService.getGPhotosMediaItem.and.returnValue(
      of(toFailure<GetGPhotosMediaItemDetailsResponse>(error)),
    );

    store.loadGPhotosMediaItemDetails(gPhotoId);

    const result = store.gPhotosMediaItem();
    expect(result).toEqual(toFailure(error));
  });

  it('should reset state before each load', () => {
    const secondImage: GPhotosMediaItem = {
      baseUrl: 'http://www.google.com/photos/2',
      mimeType: 'video/mp4',
      mediaMetadata: {
        creationTime: '',
        width: '4032',
        height: '3024',
      },
    };

    webApiService.getGPhotosMediaItem.and.returnValues(
      of(toSuccess(gPhotosMediaItem)),
      of(toSuccess(secondImage)),
    );

    store.loadGPhotosMediaItemDetails('1');
    expect(store.gPhotosMediaItem()).toEqual(toSuccess(gPhotosMediaItem));

    store.loadGPhotosMediaItemDetails('2');
    expect(store.gPhotosMediaItem()).toEqual(toSuccess(secondImage));
  });
});
