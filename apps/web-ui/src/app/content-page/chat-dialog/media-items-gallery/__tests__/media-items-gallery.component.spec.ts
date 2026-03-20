import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../auth/store';
import { toSuccess } from '../../../../shared/results/results';
import { GPhotosMediaItem } from '../../../services/web-api/types/gphotos-media-item';
import { MediaItem } from '../../../services/web-api/types/media-item';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { MediaItemsGalleryComponent } from '../media-items-gallery.component';
import { MediaItemsGalleryStore } from '../media-items-gallery.store';

const GMEDIA_ITEM_DETAILS_PHOTO_1: GPhotosMediaItem = {
  baseUrl: 'https://www.google.com/photos/1',
  mimeType: 'image/jpeg',
  mediaMetadata: {
    creationTime: '',
    width: '4032',
    height: '3024',
  },
};

describe('MediaItemsGalleryComponent (with real store, mock API)', () => {
  let fixture: ComponentFixture<MediaItemsGalleryComponent>;
  let webApiServiceSpy: jasmine.SpyObj<WebApiService>;

  const fakeToken = 'fake-auth-token';

  const makeMediaItem = (id: string): MediaItem => ({
    id,
    fileName: `${id}.jpg`,
    hashCode: `hash-${id}`,
    gPhotosMediaItemId: `g-${id}`,
    width: 400,
    height: 300,
    dateTaken: new Date(),
    location: { latitude: 0, longitude: 0 },
    mimeType: 'image/jpeg',
  });

  beforeEach(async () => {
    webApiServiceSpy = jasmine.createSpyObj<WebApiService>('WebApiService', [
      'bulkGetMediaItemsByIds',
      'getGPhotosMediaItem',
    ]);
    webApiServiceSpy.getGPhotosMediaItem.and.returnValues(
      of(toSuccess(GMEDIA_ITEM_DETAILS_PHOTO_1)),
    );

    await TestBed.configureTestingModule({
      imports: [MediaItemsGalleryComponent],
      providers: [
        MediaItemsGalleryStore,
        provideMockStore({
          selectors: [
            { selector: authState.selectAuthToken, value: fakeToken },
          ],
        }),
        { provide: WebApiService, useValue: webApiServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaItemsGalleryComponent);
  });

  it('should render all images and not show the "See more" button when <= 5 images', () => {
    const items = Array.from({ length: 3 }, (_, i) =>
      makeMediaItem(`${i + 1}`),
    );
    webApiServiceSpy.bulkGetMediaItemsByIds.and.returnValue(
      of(toSuccess({ mediaItems: items })),
    );

    fixture.componentRef.setInput(
      'mediaItemIds',
      items.map((i) => i.id),
    );
    fixture.detectChanges();

    const imgs = fixture.debugElement.queryAll(By.css('app-image'));
    expect(imgs.length).toBe(3);
    expect(fixture.debugElement.query(By.css('button'))).toBeNull();
  });

  it('should render only 5 images and show the "See more" button when there are more than 5 images to display', () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      makeMediaItem(`${i + 1}`),
    );
    webApiServiceSpy.bulkGetMediaItemsByIds.and.returnValue(
      of(toSuccess({ mediaItems: items })),
    );

    fixture.componentRef.setInput(
      'mediaItemIds',
      items.map((i) => i.id),
    );
    fixture.detectChanges();

    const imgs = fixture.debugElement.queryAll(By.css('app-image'));
    expect(imgs.length).toBe(5);
    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn.nativeElement.textContent).toContain('See 1 more');
  });

  it('should render all images and hide "See more" button after clicking toggle given more than 5 images to display', () => {
    const items = Array.from({ length: 7 }, (_, i) =>
      makeMediaItem(`${i + 1}`),
    );
    webApiServiceSpy.bulkGetMediaItemsByIds.and.returnValue(
      of(toSuccess({ mediaItems: items })),
    );

    fixture.componentRef.setInput(
      'mediaItemIds',
      items.map((i) => i.id),
    );
    fixture.detectChanges();

    const btn = fixture.debugElement.query(By.css('button'));
    btn.nativeElement.click();
    fixture.detectChanges();

    const imgs = fixture.debugElement.queryAll(By.css('app-image'));
    expect(imgs.length).toBe(7);
    expect(fixture.debugElement.query(By.css('button'))).toBeNull();
  });
});
