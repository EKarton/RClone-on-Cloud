import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { MAPBOX_FACTORY_TOKEN } from '../../../../../app.tokens';
import { authState } from '../../../../../auth/store';
import { MockMapboxFactory } from '../../../../../shared/mapbox-factory/__mocks__/MockMapboxFactory';
import { toSuccess } from '../../../../../shared/results/results';
import { MediaViewerRequest } from '../../../../media-viewer/media-viewer.request';
import { GPhotosMediaItem } from '../../../../services/web-api/types/gphotos-media-item';
import { Heatmap } from '../../../../services/web-api/types/heatmap';
import { MediaItem } from '../../../../services/web-api/types/media-item';
import { WebApiService } from '../../../../services/web-api/web-api.service';
import { dialogsState } from '../../../../store/dialogs';
import { openDialog } from '../../../../store/dialogs/dialogs.actions';
import { ImageMapMarkerComponent } from '../image-map-marker/image-map-marker.component';
import {
  ImagesMapViewerComponent,
  TileId,
} from '../images-map-viewer.component';

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
  id: 'client1:photos1',
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
  id: 'client1:photos2',
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

describe('ImagesMapViewerComponent', () => {
  let store: MockStore;
  let mockWebApiService: jasmine.SpyObj<WebApiService>;
  let mockMapboxFactory: MockMapboxFactory<ImageMapMarkerComponent>;

  beforeEach(async () => {
    mockWebApiService = jasmine.createSpyObj('WebApiService', [
      'getHeatmap',
      'getMediaItem',
      'getGPhotosMediaItem',
    ]);
    mockMapboxFactory = new MockMapboxFactory();

    await TestBed.configureTestingModule({
      imports: [ImagesMapViewerComponent],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: {
            [dialogsState.FEATURE_KEY]: dialogsState.initialState,
          },
          selectors: [
            { selector: authState.selectAuthToken, value: 'mockAccessToken' },
            { selector: authState.selectMapboxApiToken, value: 'mockApiToken' },
          ],
        }),
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

  it('should add heat map and map markers when map loads and map markers is in the viewport', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // It should set the correct style
    expect(mapInstances[0].setStyle).toHaveBeenCalledWith(
      'mapbox://styles/mapbox/streets-v12',
    );

    // It should build the heat map and tile map
    expect(mapInstances[0].addSource).toHaveBeenCalledTimes(2);
    expect(mapInstances[0].addLayer).toHaveBeenCalledTimes(3);

    // It should show two markers
    const markers = mockMapboxFactory.getVisibleMarkerInstances();
    expect(markers.length).toEqual(2);
    expect(markers[0].getComponentInstance()?.instance.badgeCount()).toEqual(1);
    expect(markers[1].getComponentInstance()?.instance.badgeCount()).toEqual(3);
  }));

  it('should re-render the map when isDarkMode changes', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.componentRef.setInput('isDarkMode', false);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Change the mode to dark mode
    fixture.componentRef.setInput('isDarkMode', true);
    fixture.detectChanges();
    tick();
    mapInstances[0].triggerOnceEvents('styledata');
    fixture.detectChanges();
    tick();

    // It should set the style to a new style
    expect(mapInstances[0].setStyle).toHaveBeenCalledWith(
      'mapbox://styles/mapbox/dark-v11',
    );

    // It should only call addLayer() and addSource() for heat map and tiles once
    expect(mapInstances[0].addSource).toHaveBeenCalledTimes(2);
    expect(mapInstances[0].addLayer).toHaveBeenCalledTimes(3);

    // It should show two markers
    const markers = mockMapboxFactory.getVisibleMarkerInstances();
    expect(markers.length).toEqual(2);
    expect(markers[0].getComponentInstance()?.instance.badgeCount()).toEqual(1);
    expect(markers[1].getComponentInstance()?.instance.badgeCount()).toEqual(3);
  }));

  it('should output visibleTilesChanged when map pans', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Listen to visibleTilesChanged events
    let newTilesEmitted1 = false;
    fixture.componentInstance.visibleTilesChanged.subscribe(() => {
      newTilesEmitted1 = true;
    });

    // Move map to the right
    mapInstances[0].setBounds(-70, 95, -80, 75);
    mapInstances[0].triggerOnEvent('moveend');
    fixture.detectChanges();
    tick();

    // Expect the visibleTilesChanged to be emitted
    expect(newTilesEmitted1).toBeTrue();
  }));

  it('should open the image viewer when user clicks on an individual map marker', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Check there is only one cluster marker
    const markers = mockMapboxFactory.getVisibleMarkerInstances();
    expect(markers.length).toEqual(2);

    // Click on one of the markers
    const mouseEvent = new MouseEvent('click');
    markers[0].getComponentInstance()?.instance.markerClick.emit(mouseEvent);
    fixture.detectChanges();
    tick();

    // Expect the media viewer to be dispatched
    expect(store.dispatch).toHaveBeenCalledWith(
      openDialog({
        request: new MediaViewerRequest(MEDIA_ITEM_1.id),
      }),
    );
  }));

  it('should cluster heat maps together when they are closeby', fakeAsync(() => {
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
          longitude: 80,
          sampledMediaItemId: 'client1:photos2',
        },
      ],
    };
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', heatmap);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Check there is only one cluster marker
    const markers = mockMapboxFactory.getVisibleMarkerInstances();
    expect(markers.length).toEqual(1);

    // Expect the counts to be summed together
    expect(markers[0].getComponentInstance()?.instance.badgeCount()).toEqual(4);
  }));

  it('should zoom into the map when user clicks on a cluster of images', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Check there is only one cluster marker
    const markers = mockMapboxFactory.getVisibleMarkerInstances();
    expect(markers.length).toEqual(2);

    // Click on the marker
    const mouseEvent = new MouseEvent('click');
    markers[1].getComponentInstance()?.instance.markerClick.emit(mouseEvent);
    fixture.detectChanges();
    tick();

    // Expect the map to zoom in
    expect(mapInstances[0].easeTo).toHaveBeenCalled();
  }));

  it('should not create map markers when map has not loaded yet but user has moved the map', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.detectChanges();
    tick();

    // Move the map without the map loading yet
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('moveend');
    fixture.detectChanges();
    tick();

    // Expect no map markers to be created
    expect(mockMapboxFactory.getMarkerInstances().length).toEqual(0);
  }));

  it('should emit empty list in visibleTilesChanged when map has no bounds yet', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.detectChanges();
    tick();

    // Listen to visibleTilesChanged events
    const newTilesEmitted: TileId[][] = [];
    fixture.componentInstance.visibleTilesChanged.subscribe((newTiles) =>
      newTilesEmitted.push(newTiles),
    );

    // Move the map without bounds
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Expect newTilesEmitted to emit empty list
    expect(newTilesEmitted).toEqual([[]]);
  }));

  it('should hide markers when the showMarkers input has changed to false', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.componentRef.setInput('showMarkers', true);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Change showMarkers to false
    fixture.componentRef.setInput('showMarkers', false);
    fixture.detectChanges();
    tick();

    // It should show no markers
    const markers = mockMapboxFactory.getVisibleMarkerInstances();
    expect(markers.length).toEqual(0);
  }));

  it('should show markers when the showMarkers input has changed to true', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.componentRef.setInput('showMarkers', false);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Change showMarkers to true
    fixture.componentRef.setInput('showMarkers', true);
    fixture.detectChanges();
    tick();

    // It should show two markers
    const markers = mockMapboxFactory.getVisibleMarkerInstances();
    expect(markers.length).toEqual(2);
  }));

  it('should hide the heat map when showHeatmap is set to false', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.componentRef.setInput('showHeatmap', true);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Change showMarkers to true
    fixture.componentRef.setInput('showHeatmap', false);
    fixture.detectChanges();
    tick();

    // It should show two markers
    expect(
      mockMapboxFactory.getMapInstances()[0].setLayoutProperty,
    ).toHaveBeenCalledWith('heatmap-layer', 'visibility', 'none');
  }));

  it('should hide the heat map when showHeatmap is set to true', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.componentRef.setInput('showHeatmap', false);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Change showMarkers to true
    fixture.componentRef.setInput('showHeatmap', true);
    fixture.detectChanges();
    tick();

    // It should show two markers
    expect(
      mockMapboxFactory.getMapInstances()[0].setLayoutProperty,
    ).toHaveBeenCalledWith('heatmap-layer', 'visibility', 'visible');
  }));

  it('should hide the tiles map when showTiles is set to false', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.componentRef.setInput('showTiles', true);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Change showTiles to true
    fixture.componentRef.setInput('showTiles', false);
    fixture.detectChanges();
    tick();

    // It should hide the two tile layers
    expect(
      mockMapboxFactory.getMapInstances()[0].setLayoutProperty,
    ).toHaveBeenCalledWith('tile-grid-fill', 'visibility', 'none');
    expect(
      mockMapboxFactory.getMapInstances()[0].setLayoutProperty,
    ).toHaveBeenCalledWith('tile-grid-outline', 'visibility', 'none');
  }));

  it('should hide the tiles map when showTiles is set to true', fakeAsync(() => {
    const fixture = TestBed.createComponent(ImagesMapViewerComponent);
    fixture.componentRef.setInput('heatmap', HEATMAP);
    fixture.componentRef.setInput('showTiles', false);
    fixture.detectChanges();
    tick();

    // Load the map
    const mapInstances = mockMapboxFactory.getMapInstances();
    expect(mapInstances.length).toEqual(1);
    mapInstances[0].setBounds(-70, 90, -80, 70);
    mapInstances[0].triggerOnEvent('load');
    fixture.detectChanges();
    tick();

    // Change showTiles to true
    fixture.componentRef.setInput('showTiles', true);
    fixture.detectChanges();
    tick();

    // It should show the two tile layers
    expect(
      mockMapboxFactory.getMapInstances()[0].setLayoutProperty,
    ).toHaveBeenCalledWith('tile-grid-fill', 'visibility', 'visible');
    expect(
      mockMapboxFactory.getMapInstances()[0].setLayoutProperty,
    ).toHaveBeenCalledWith('tile-grid-outline', 'visibility', 'visible');
  }));
});
