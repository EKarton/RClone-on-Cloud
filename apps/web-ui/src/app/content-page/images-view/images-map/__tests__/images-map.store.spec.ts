import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import {
  toFailure,
  toPending,
  toSuccess,
} from '../../../../shared/results/results';
import { Heatmap } from '../../../services/web-api/types/heatmap';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { ImagesMapStore, INITIAL_STATE } from '../images-map.store';
import { TileId } from '../images-map-viewer/images-map-viewer.component';

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
      longitude: 80,
      sampledMediaItemId: 'client1:photos2',
    },
  ],
};

const TILES: TileId[] = [
  {
    x: 1,
    y: 2,
    z: 3,
  },
  {
    x: 4,
    y: 5,
    z: 6,
  },
];

describe('ImagesMapStore', () => {
  let store: ImagesMapStore;
  let mockWebApi: jasmine.SpyObj<WebApiService>;
  let mockNgRxStore: jasmine.SpyObj<Store>;

  beforeEach(() => {
    mockWebApi = jasmine.createSpyObj('WebApiService', ['getHeatmap']);
    mockNgRxStore = jasmine.createSpyObj('Store', ['select']);

    TestBed.configureTestingModule({
      providers: [
        ImagesMapStore,
        { provide: WebApiService, useValue: mockWebApi },
        { provide: Store, useValue: mockNgRxStore },
      ],
    });

    store = TestBed.inject(ImagesMapStore);
  });

  it('should initialize with the correct initial state', () => {
    expect(store.state()).toEqual(INITIAL_STATE);
  });

  it('should set heatmapResult to pending and numTiles when loadImages is called', fakeAsync(() => {
    mockNgRxStore.select.and.returnValue(of('accessToken'));
    mockWebApi.getHeatmap.and.returnValue(of(toPending<Heatmap>()));

    store.loadTiles({ tileIds: TILES, albumId: '' });
    tick();

    expect(store.heatmapResult()).toEqual(toPending());
    expect(store.numTiles()).toEqual(2);
  }));

  it('should fetch images and update state on success', fakeAsync(() => {
    mockNgRxStore.select.and.returnValue(of('accessToken'));
    mockWebApi.getHeatmap.and.returnValue(of(toSuccess(HEATMAP)));

    store.loadTiles({ tileIds: TILES, albumId: '' });

    expect(store.heatmapResult()).toEqual(
      toSuccess({
        points: HEATMAP.points.concat(HEATMAP.points),
      }),
    );
    expect(store.numTiles()).toEqual(2);
  }));

  it('should handle errors and not update imagesResult on error', fakeAsync(() => {
    const error = new Error('Random error');
    mockNgRxStore.select.and.returnValue(of('accessToken'));
    mockWebApi.getHeatmap.and.returnValue(of(toFailure<Heatmap>(error)));

    store.loadTiles({ tileIds: TILES, albumId: '' });

    expect(store.heatmapResult()).toEqual(toFailure(error));
    expect(store.numTiles()).toEqual(2);
  }));
});
