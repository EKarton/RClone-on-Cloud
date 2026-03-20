import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
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
import { ImageMapMarkerComponent } from '../image-map-marker.component';

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

describe('ImageMapMarkerComponent', () => {
  let store: MockStore;
  let mockWebApiService: jasmine.SpyObj<WebApiService>;

  beforeEach(async () => {
    mockWebApiService = jasmine.createSpyObj('WebApiService', [
      'getMediaItem',
      'getGPhotosMediaItem',
    ]);

    await TestBed.configureTestingModule({
      imports: [ImageMapMarkerComponent],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          selectors: [
            { selector: authState.selectAuthToken, value: 'mockAccessToken' },
          ],
        }),
        {
          provide: WebApiService,
          useValue: mockWebApiService,
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
  });

  it('should render skeleton when media item is not loaded yet', () => {
    mockWebApiService.getMediaItem.and.returnValue(
      of(toPending<MediaItemDetailsApiResponse>()),
    );
    mockWebApiService.getGPhotosMediaItem.and.returnValue(
      of(toPending<GetGPhotosMediaItemDetailsResponse>()),
    );

    const fixture = TestBed.createComponent(ImageMapMarkerComponent);
    fixture.componentRef.setInput('mediaItemId', MEDIA_ITEM_ID);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector(
      '[data-testid="image-loading"]',
    );
    expect(spinner).toBeTruthy();
  });

  it('should render error when fetching media item failed', () => {
    mockWebApiService.getMediaItem.and.returnValue(
      of(toFailure<MediaItemDetailsApiResponse>(new Error('Random error'))),
    );
    mockWebApiService.getGPhotosMediaItem.and.returnValue(
      of(toPending<GetGPhotosMediaItemDetailsResponse>()),
    );

    const fixture = TestBed.createComponent(ImageMapMarkerComponent);
    fixture.componentRef.setInput('mediaItemId', MEDIA_ITEM_ID);
    fixture.detectChanges();
    fixture.componentInstance.setIsInViewport(true);
    fixture.detectChanges();

    const failedMessage = fixture.nativeElement.querySelector(
      '[data-testid="image-failed"]',
    );
    expect(failedMessage).toBeTruthy();
  });

  it('should fetch gphotos media item and render image when it is in viewport', () => {
    mockWebApiService.getMediaItem.and.returnValue(of(toSuccess(MEDIA_ITEM)));
    mockWebApiService.getGPhotosMediaItem.and.returnValue(
      of(toSuccess(GPHOTOS_MEDIA_ITEM)),
    );

    const fixture = TestBed.createComponent(ImageMapMarkerComponent);
    fixture.componentRef.setInput('mediaItemId', MEDIA_ITEM_ID);
    fixture.detectChanges();
    fixture.componentInstance.setIsInViewport(true);
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector(
      '[data-testid="image-loaded"]',
    );
    expect(image).toBeTruthy();
    expect(mockWebApiService.getMediaItem).toHaveBeenCalledWith(
      'mockAccessToken',
      MEDIA_ITEM_ID,
    );
    expect(mockWebApiService.getGPhotosMediaItem).toHaveBeenCalledWith(
      'mockAccessToken',
      { gPhotosMediaItemId: GPHOTOS_MEDIA_ITEM_ID },
    );
  });

  [
    {
      event: new KeyboardEvent('keydown', {
        key: 'Space',
        code: 'Space',
      }),
    },
    {
      event: new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
      }),
    },
    {
      event: new MouseEvent('click'),
    },
  ].forEach(({ event }) => {
    it(`should emit event when user emits event ${event} on image`, () => {
      mockWebApiService.getMediaItem.and.returnValue(of(toSuccess(MEDIA_ITEM)));
      mockWebApiService.getGPhotosMediaItem.and.returnValue(
        of(toSuccess(GPHOTOS_MEDIA_ITEM)),
      );
      const fixture = TestBed.createComponent(ImageMapMarkerComponent);
      fixture.componentRef.setInput('mediaItemId', MEDIA_ITEM_ID);
      fixture.detectChanges();
      fixture.componentInstance.setIsInViewport(true);
      fixture.detectChanges();
      let emitted = false;
      fixture.componentInstance.markerClick.subscribe(() => {
        emitted = true;
      });

      fixture.nativeElement.querySelector('div').dispatchEvent(event);

      expect(emitted).toBeTrue();
    });
  });
});
