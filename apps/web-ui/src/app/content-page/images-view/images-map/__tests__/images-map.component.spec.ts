import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { MAPBOX_FACTORY_TOKEN, WINDOW } from '../../../../app.tokens';
import { authState } from '../../../../auth/store';
import { MockMapboxFactory } from '../../../../shared/mapbox-factory/__mocks__/MockMapboxFactory';
import { toSuccess } from '../../../../shared/results/results';
import { themeState } from '../../../../themes/store';
import { GPhotosMediaItem } from '../../../services/web-api/types/gphotos-media-item';
import { Heatmap } from '../../../services/web-api/types/heatmap';
import { MediaItem } from '../../../services/web-api/types/media-item';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { albumsState } from '../../../store/albums';
import { ImagesMapComponent } from '../images-map.component';
import { ImageMapMarkerComponent } from '../images-map-viewer/image-map-marker/image-map-marker.component';

const HEATMAP: Heatmap = {
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

const MEDIA_ITEM_1: MediaItem = {
  id: 'photos1',
  fileName: 'cat.png',
  hashCode: '',
  gPhotosMediaItemId: 'gPhotosClient1:gPhotosMediaItem1',
  width: 200,
  height: 300,
  location: {
    latitude: -79,
    longitude: 80,
  },
  dateTaken: new Date('2024-05-27T13:17:46.000Z'),
  mimeType: 'image/png',
};

const MEDIA_ITEM_2: MediaItem = {
  id: 'photos2',
  fileName: 'dog.png',
  hashCode: '',
  gPhotosMediaItemId: 'gPhotosClient1:gPhotosMediaItem2',
  width: 200,
  height: 300,
  location: {
    latitude: -79,
    longitude: 80.1,
  },
  dateTaken: new Date('2024-05-27T13:17:46.000Z'),
  mimeType: 'image/png',
};

const G_MEDIA_ITEM: GPhotosMediaItem = {
  baseUrl: 'http://www.google.com/photos/1',
  mimeType: 'image/png',
  mediaMetadata: {
    creationTime: '',
    width: '4032',
    height: '3024',
  },
};

describe('ImagesMapComponent', () => {
  let store: MockStore;
  let mockWebApiService: jasmine.SpyObj<WebApiService>;
  let mockMapboxFactory: MockMapboxFactory<ImageMapMarkerComponent>;

  beforeEach(async () => {
    mockWebApiService = jasmine.createSpyObj('WebApiService', [
      'getHeatmap',
      'getGPhotosMediaItem',
      'getMediaItem',
    ]);
    mockMapboxFactory = new MockMapboxFactory();

    await TestBed.configureTestingModule({
      imports: [ImagesMapComponent],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: {
            [albumsState.FEATURE_KEY]: albumsState.buildInitialState(),
          },
          selectors: [
            { selector: authState.selectAuthToken, value: 'mockAccessToken' },
            { selector: themeState.selectIsDarkMode, value: false },
            { selector: authState.selectMapboxApiToken, value: 'mockApiToken' },
          ],
        }),
        {
          provide: WINDOW,
          useValue: { open: jasmine.createSpy() },
        },
        {
          provide: WebApiService,
          useValue: mockWebApiService,
        },
        {
          provide: MAPBOX_FACTORY_TOKEN,
          useValue: mockMapboxFactory,
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');

    mockWebApiService.getHeatmap.and.returnValue(of(toSuccess(HEATMAP)));
    mockWebApiService.getMediaItem.and.callFake(
      (_accessToken: string, mediaItemId: string) => {
        return mediaItemId === 'photos1'
          ? of(toSuccess(MEDIA_ITEM_1))
          : of(toSuccess(MEDIA_ITEM_2));
      },
    );
    mockWebApiService.getGPhotosMediaItem.and.returnValue(
      of(toSuccess(G_MEDIA_ITEM)),
    );
  });

  it('should render map with markers', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapComponent);
    fixture.componentRef.setInput('albumId', 'album1');
    fixture.detectChanges();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Expect the heatmap, markers, and tiles to be visible
    expect(mockMapboxFactory.getVisibleMarkerInstances().length).toEqual(2);
  }));

  it('should go to full screen when user clicks on the fullscreen button', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapComponent);
    fixture.componentRef.setInput('albumId', 'album1');
    fixture.detectChanges();

    // Mock the requestFullscreen
    spyOn(
      fixture.componentInstance.fullscreenContainer.nativeElement,
      'requestFullscreen',
    ).and.returnValue(Promise.resolve());

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');

    // Click on the full screen button
    fixture.nativeElement
      .querySelector('[data-testid="fullscreen-button"]')
      .click();
    tick();
    fixture.detectChanges();

    // Expect it to go to full screen
    expect(
      fixture.componentInstance.fullscreenContainer.nativeElement
        .requestFullscreen,
    ).toHaveBeenCalled();
    expect(fixture.componentInstance.isFullscreen()).toBeTrue();
  }));

  it('should show a snack bar when clicking on full screen button fails', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapComponent);
    fixture.componentRef.setInput('albumId', 'album1');
    fixture.detectChanges();

    // Mock the requestFullscreen
    spyOn(
      fixture.componentInstance.fullscreenContainer.nativeElement,
      'requestFullscreen',
    ).and.returnValue(Promise.reject(new Error('Random error')));

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');

    // Click on the full screen button
    fixture.nativeElement
      .querySelector('[data-testid="fullscreen-button"]')
      .click();
    fixture.detectChanges();
    tick();

    // Expect it to go to full screen
    expect(
      fixture.componentInstance.fullscreenContainer.nativeElement
        .requestFullscreen,
    ).toHaveBeenCalled();
    expect(fixture.componentInstance.isFullscreen()).toBeFalse();
  }));

  it('should exit full screen when user clicks on the full screen button given the map is already in full screen', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapComponent);
    fixture.componentRef.setInput('albumId', 'album1');
    fixture.detectChanges();

    // Mock the requestFullscreen
    spyOn(
      fixture.componentInstance.fullscreenContainer.nativeElement,
      'requestFullscreen',
    ).and.returnValue(Promise.resolve());

    // Mock document.exitFullscreen
    spyOn(document, 'exitFullscreen').and.returnValue(Promise.resolve());

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');

    // Go to full screen
    fixture.nativeElement
      .querySelector('[data-testid="fullscreen-button"]')
      .click();
    fixture.detectChanges();
    tick();

    // Click on the full screen button to exit out of full screen
    fixture.nativeElement
      .querySelector('[data-testid="fullscreen-button"]')
      .click();
    fixture.detectChanges();

    // Expect it to exit out of full screen
    expect(document.exitFullscreen).toHaveBeenCalled();
    expect(fixture.componentInstance.isFullscreen()).toBeFalse();
  }));

  it('should exit full screen when user clicks on the Escape key given the map is already in full screen', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapComponent);
    fixture.componentRef.setInput('albumId', 'album1');
    fixture.detectChanges();

    // Mock the requestFullscreen
    spyOn(
      fixture.componentInstance.fullscreenContainer.nativeElement,
      'requestFullscreen',
    ).and.returnValue(Promise.resolve());

    // Mock document.exitFullscreen
    spyOn(document, 'exitFullscreen').and.returnValue(Promise.resolve());

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');

    // Go to full screen
    fixture.nativeElement
      .querySelector('[data-testid="fullscreen-button"]')
      .click();
    fixture.detectChanges();
    tick();

    // Trigger closing full screen via Escape key
    const event = new Event('fullscreenchange');
    document.dispatchEvent(event);
    tick();
    fixture.detectChanges();

    expect(fixture.componentInstance.isFullscreen()).toBeFalse();
  }));
});
