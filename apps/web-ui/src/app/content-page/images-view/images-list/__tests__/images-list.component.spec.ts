import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { RESIZE_OBSERVER_FACTORY_TOKEN } from '../../../../app.tokens';
import { authState } from '../../../../auth/store';
import { MockResizeObserverFactory } from '../../../../shared/resize-observer-factory/__mocks__/MockResizeObserverFactory';
import { toSuccess } from '../../../../shared/results/results';
import { GPhotosMediaItem } from '../../../services/web-api/types/gphotos-media-item';
import {
  ListMediaItemsResponse,
  ListMediaItemsSortByFields,
  ListMediaItemsSortDirection,
} from '../../../services/web-api/types/list-media-items';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { dialogsState } from '../../../store/dialogs';
import { ImagesListComponent } from '../images-list.component';

const PAGE_1: ListMediaItemsResponse = {
  mediaItems: [
    {
      id: 'photos1',
      fileName: 'cat.png',
      hashCode: '',
      gPhotosMediaItemId: 'gPhotosClient1:gPhotosMediaItem1',
      width: 200,
      height: 300,
      dateTaken: new Date('2024-05-27T13:17:46.000Z'),
      mimeType: 'image/png',
    },
    {
      id: 'photos2',
      fileName: 'cat.png',
      hashCode: '',
      gPhotosMediaItemId: 'gPhotosClient1:gPhotosMediaItem2',
      width: 200,
      height: 300,
      dateTaken: new Date('2024-05-27T13:17:46.000Z'),
      mimeType: 'image/png',
    },
  ],
  nextPageToken: '123456789',
};

const PAGE_2: ListMediaItemsResponse = {
  mediaItems: [
    {
      id: 'photos3',
      fileName: 'lizard.png',
      hashCode: '',
      gPhotosMediaItemId: 'gPhotosClient1:gPhotosMediaItem3',
      width: 200,
      height: 300,
      dateTaken: new Date('2024-05-27T13:17:46.000Z'),
      mimeType: 'image/png',
    },
  ],
};

const GMEDIA_ITEM_DETAILS_PHOTO_1: GPhotosMediaItem = {
  baseUrl: 'https://www.google.com/photos/1',
  mimeType: 'image/jpeg',
  mediaMetadata: {
    creationTime: '',
    width: '4032',
    height: '3024',
  },
};

const GMEDIA_ITEM_DETAILS_PHOTO_2: GPhotosMediaItem = {
  baseUrl: 'https://www.google.com/photos/2',
  mimeType: 'image/jpeg',
  mediaMetadata: {
    creationTime: '',
    width: '4032',
    height: '3024',
  },
};

const GMEDIA_ITEM_DETAILS_PHOTO_3: GPhotosMediaItem = {
  baseUrl: 'https://www.google.com/photos/3',
  mimeType: 'image/jpeg',
  mediaMetadata: {
    creationTime: '',
    width: '4032',
    height: '3024',
  },
};

describe('ImagesListComponent', () => {
  let mockWebApiService: jasmine.SpyObj<WebApiService>;
  let mockResizeObserverFactory: MockResizeObserverFactory;

  beforeEach(async () => {
    mockWebApiService = jasmine.createSpyObj('WebApiService', [
      'listMediaItems',
      'getGPhotosMediaItem',
    ]);
    mockWebApiService.listMediaItems.and.returnValues(
      of(toSuccess(PAGE_1)),
      of(toSuccess(PAGE_2)),
    );
    mockWebApiService.getGPhotosMediaItem.and.returnValues(
      of(toSuccess(GMEDIA_ITEM_DETAILS_PHOTO_1)),
      of(toSuccess(GMEDIA_ITEM_DETAILS_PHOTO_2)),
      of(toSuccess(GMEDIA_ITEM_DETAILS_PHOTO_3)),
    );

    await TestBed.configureTestingModule({
      imports: [ImagesListComponent],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: {
            [dialogsState.FEATURE_KEY]: dialogsState.initialState,
          },
          selectors: [
            { selector: authState.selectAuthToken, value: 'mockAccessToken' },
          ],
        }),
        { provide: WebApiService, useValue: mockWebApiService },
        {
          provide: RESIZE_OBSERVER_FACTORY_TOKEN,
          useValue: new MockResizeObserverFactory(),
        },
      ],
    }).compileComponents();

    mockResizeObserverFactory = TestBed.inject(
      RESIZE_OBSERVER_FACTORY_TOKEN,
    ) as MockResizeObserverFactory;
  });

  it('should load image skeletons', () => {
    const fixture = TestBed.createComponent(ImagesListComponent);
    fixture.componentRef.setInput('albumId', ['album1']);
    fixture.componentRef.setInput('sortBy', {
      field: ListMediaItemsSortByFields.ID,
      direction: ListMediaItemsSortDirection.ASCENDING,
    });
    fixture.detectChanges();

    const elements = fixture.nativeElement.querySelectorAll(
      '[data-testid="image-loading"]',
    );
    expect(elements.length).toEqual(2);
  });

  [
    {
      hostElementWidth: 200,
      expectedImageWidths: [95, 95],
      expectedImageHeights: [143, 143],
    },
    {
      hostElementWidth: 500,
      expectedImageWidths: [160, 160],
      expectedImageHeights: [240, 240],
    },
    {
      hostElementWidth: 1200,
      expectedImageWidths: [292, 292],
      expectedImageHeights: [438, 438],
    },
    {
      hostElementWidth: 1600,
      expectedImageWidths: [312, 312],
      expectedImageHeights: [468, 468],
    },
  ].forEach(
    ({ hostElementWidth, expectedImageWidths, expectedImageHeights }) => {
      it(`should resize images correctly when the component width changes to ${hostElementWidth}`, async () => {
        // Render the component
        const fixture = TestBed.createComponent(ImagesListComponent);
        fixture.componentRef.setInput('albumId', ['album1']);
        fixture.componentRef.setInput('sortBy', {
          field: ListMediaItemsSortByFields.ID,
          direction: ListMediaItemsSortDirection.ASCENDING,
        });
        fixture.detectChanges();

        // Simulate a resize event
        const entry: ResizeObserverEntry = {
          borderBoxSize: [],
          contentBoxSize: [],
          contentRect: {
            bottom: 0,
            height: 0,
            left: 0,
            right: 0,
            top: 0,
            width: hostElementWidth,
            x: 0,
            y: 0,
            toJSON: () => Object,
          },
          devicePixelContentBoxSize: [],
          target: fixture.nativeElement,
        };

        // Trigger the observer's callback
        mockResizeObserverFactory.getInstances()[0].trigger([entry]);
        fixture.detectChanges();
        await fixture.whenStable();

        // Assert the images resized correctly
        const elements: HTMLElement[] = Array.from(
          fixture.nativeElement.querySelectorAll(
            '[data-testid="image-loading"]',
          ),
        );
        const widths = Array.from(elements).map((e) => e.clientWidth);
        const heights = Array.from(elements).map((e) => e.clientHeight);
        expect(widths).toEqual(expectedImageWidths);
        expect(heights).toEqual(expectedImageHeights);
      });
    },
  );

  it('should fetch more images given user has scrolled', () => {
    const fixture = TestBed.createComponent(ImagesListComponent);
    fixture.componentRef.setInput('albumId', ['album1']);
    fixture.componentRef.setInput('sortBy', {
      field: ListMediaItemsSortByFields.ID,
      direction: ListMediaItemsSortDirection.ASCENDING,
    });
    fixture.detectChanges();

    fixture.componentInstance.loadMoreMediaItems();
    fixture.detectChanges();

    expect(fixture.componentInstance.images().length).toEqual(3);
  });
});
