import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../../auth/store';
import {
  toFailure,
  toPending,
  toSuccess,
} from '../../../../../shared/results/results';
import { Album } from '../../../../services/web-api/types/album';
import { ListAlbumsResponse } from '../../../../services/web-api/types/list-albums';
import { WebApiService } from '../../../../services/web-api/web-api.service';
import { addAlbum } from '../../../../store/albums/albums.actions';
import { AlbumsListCardsStore } from '../albums-list-cards.store';

describe('AlbumsListCardsStore', () => {
  let componentStore: AlbumsListCardsStore;
  let webApiService: jasmine.SpyObj<WebApiService>;
  let store: Store;

  const fakeToken = 'fake-auth-token';
  const fakeAlbumId = 'album-abc';

  const album1: Album = {
    id: '1',
    albumName: 'First Album',
    numMediaItems: 5,
    numChildAlbums: 0,
  };

  const album2: Album = {
    id: '2',
    albumName: 'Second Album',
    numMediaItems: 2,
    numChildAlbums: 1,
  };

  const firstPage: ListAlbumsResponse = {
    albums: [album1],
    nextPageToken: 'next-token',
  };

  const secondPage: ListAlbumsResponse = {
    albums: [album2],
    nextPageToken: undefined,
  };

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('WebApiService', ['listAlbums']);

    TestBed.configureTestingModule({
      providers: [
        AlbumsListCardsStore,
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

    componentStore = TestBed.inject(AlbumsListCardsStore);

    webApiService = TestBed.inject(
      WebApiService,
    ) as jasmine.SpyObj<WebApiService>;

    store = TestBed.inject(Store);
    spyOn(store, 'dispatch');
  });

  it('should initialize with pending albumsResult', () => {
    expect(componentStore.albumsResult()).toEqual(toPending());
  });

  it('should load all paginated albums and dispatch to store', (done) => {
    webApiService.listAlbums.and.callFake((_token, request) => {
      if (!request.pageToken) {
        return of(toSuccess(firstPage));
      } else {
        return of(toSuccess(secondPage));
      }
    });

    componentStore.loadAlbums({ albumId: fakeAlbumId });

    setTimeout(() => {
      const result = componentStore.albumsResult();
      expect(result).toEqual(toSuccess<Album[]>([album1, album2]));

      expect(webApiService.listAlbums).toHaveBeenCalledTimes(2);
      expect(store.dispatch).toHaveBeenCalledWith(addAlbum({ album: album1 }));
      expect(store.dispatch).toHaveBeenCalledWith(addAlbum({ album: album2 }));
      done();
    }, 200);
  });

  it('should load all paginated albums and ignore pending ones, and dispatch to store', (done) => {
    webApiService.listAlbums.and.callFake((_token, request) => {
      if (!request.pageToken) {
        return of(toSuccess(firstPage));
      } else {
        return of(toPending<ListAlbumsResponse>());
      }
    });

    componentStore.loadAlbums({ albumId: fakeAlbumId });

    setTimeout(() => {
      const result = componentStore.albumsResult();
      expect(result).toEqual(toSuccess<Album[]>([album1]));

      expect(webApiService.listAlbums).toHaveBeenCalledTimes(2);
      expect(store.dispatch).toHaveBeenCalledWith(addAlbum({ album: album1 }));
      done();
    }, 1000);
  });

  it('should set error if last paginated page has an error', (done) => {
    const error = new Error('Random error');
    webApiService.listAlbums.and.callFake((_token, request) => {
      if (!request.pageToken) {
        return of(toSuccess(firstPage));
      } else {
        return of(toFailure<ListAlbumsResponse>(error));
      }
    });

    componentStore.loadAlbums({ albumId: fakeAlbumId });

    setTimeout(() => {
      const result = componentStore.albumsResult();
      expect(result).toEqual(toFailure<Album[]>(error));

      expect(webApiService.listAlbums).toHaveBeenCalledTimes(2);
      expect(store.dispatch).toHaveBeenCalledWith(addAlbum({ album: album1 }));
      done();
    }, 200);
  });

  it('should stop on API failure and keep albumsResult as failure', () => {
    const error = new Error('API failed');
    webApiService.listAlbums.and.returnValue(
      of(toFailure<ListAlbumsResponse>(error)),
    );

    componentStore.loadAlbums({ albumId: fakeAlbumId });

    const result = componentStore.albumsResult();
    expect(result).toEqual(toFailure(error));
  });

  it('should handle only one successful page if no nextPageToken', () => {
    const onePage: ListAlbumsResponse = {
      albums: [album1],
      nextPageToken: undefined,
    };
    webApiService.listAlbums.and.returnValue(of(toSuccess(onePage)));

    componentStore.loadAlbums({ albumId: fakeAlbumId });

    expect(webApiService.listAlbums).toHaveBeenCalledTimes(1);
    expect(componentStore.albumsResult()).toEqual(toSuccess([album1]));
  });
});
