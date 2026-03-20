import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../../auth/store';
import { toFailure, toSuccess } from '../../../../../shared/results/results';
import { ListAlbumsResponse } from '../../../../services/web-api/types/list-albums';
import { WebApiService } from '../../../../services/web-api/web-api.service';
import {
  AlbumsListTableStore,
  INITIAL_STATE,
  LoadFirstPage,
} from '../albums-list-table.store';

describe('AlbumsListTableStore', () => {
  let store: AlbumsListTableStore;
  let webApiService: jasmine.SpyObj<WebApiService>;

  const fakeToken = 'fake-auth-token';
  const fakeAlbumId = 'album-abc';
  const fakeAlbumsResponse: ListAlbumsResponse = {
    albums: [
      {
        id: 'album-1',
        albumName: 'Vacation 2024',
        numMediaItems: 0,
        numChildAlbums: 0,
      },
    ],
    nextPageToken: 'next-123',
  };

  beforeEach(() => {
    const webApiSpy = jasmine.createSpyObj('WebApiService', ['listAlbums']);

    TestBed.configureTestingModule({
      providers: [
        AlbumsListTableStore,
        provideMockStore({
          selectors: [
            {
              selector: authState.selectAuthToken,
              value: fakeToken,
            },
          ],
        }),
        { provide: WebApiService, useValue: webApiSpy },
      ],
    });

    store = TestBed.inject(AlbumsListTableStore);
    webApiService = TestBed.inject(
      WebApiService,
    ) as jasmine.SpyObj<WebApiService>;
  });

  it('should initialize with default state', () => {
    expect(store.currentPage()).toEqual(INITIAL_STATE.currentPage);
    expect(store.pageNumber()).toBe(1);
  });

  describe('loadInitialPage()', () => {
    it('should load initial page successfully', () => {
      webApiService.listAlbums.and.returnValue(
        of(toSuccess(fakeAlbumsResponse)),
      );

      const request: LoadFirstPage = {
        albumId: fakeAlbumId,
        pageSize: 10,
      };
      store.loadInitialPage(of(request));

      expect(store.currentPage()).toEqual(toSuccess(fakeAlbumsResponse));
      expect(webApiService.listAlbums).toHaveBeenCalledWith(fakeToken, {
        parentAlbumId: fakeAlbumId,
        pageSize: 10,
        sortBy: undefined,
      });
    });
  });

  describe('goToNextPage()', () => {
    it('should go to next page if nextPageToken exists', () => {
      store.patchState({
        albumId: fakeAlbumId,
        currentPage: toSuccess(fakeAlbumsResponse),
        pageNumber: 1,
        pageSize: 10,
      });
      webApiService.listAlbums.and.returnValue(
        of(toSuccess(fakeAlbumsResponse)),
      );

      store.goToNextPage();

      expect(store.pageNumber()).toBe(2);
      expect(webApiService.listAlbums).toHaveBeenCalledWith(
        fakeToken,
        jasmine.objectContaining({
          parentAlbumId: fakeAlbumId,
          pageToken: 'next-123',
        }),
      );
    });

    it('should do nothing when nextPageToken is missing', () => {
      store.patchState({
        albumId: fakeAlbumId,
        currentPage: toSuccess({ albums: [], nextPageToken: undefined }),
      });

      store.goToNextPage(of(void 0));

      expect(webApiService.listAlbums).not.toHaveBeenCalled();
    });
  });

  it('should go to previous page if tokens exist', () => {
    store.patchState({
      albumId: fakeAlbumId,
      previousPageTokens: ['prev-token'],
      pageNumber: 2,
      pageSize: 10,
    });

    webApiService.listAlbums.and.returnValue(of(toSuccess(fakeAlbumsResponse)));

    store.goToPreviousPage();

    expect(store.pageNumber()).toBe(1);
    expect(store.state().previousPageTokens).toEqual([]);
    expect(webApiService.listAlbums).toHaveBeenCalledWith(
      fakeToken,
      jasmine.objectContaining({
        pageToken: 'prev-token',
      }),
    );
  });

  it('should do nothing when previousPageTokens is empty', () => {
    store.patchState({ previousPageTokens: [] });

    store.goToPreviousPage();

    expect(webApiService.listAlbums).not.toHaveBeenCalled();
  });

  it('should go to first page and reset tokens', () => {
    store.patchState({
      albumId: fakeAlbumId,
      pageNumber: 3,
      previousPageTokens: ['token1', 'token2'],
      pageSize: 10,
    });
    webApiService.listAlbums.and.returnValue(of(toSuccess(fakeAlbumsResponse)));

    store.goToFirstPage();

    expect(store.pageNumber()).toBe(1);
    expect(store.state().previousPageTokens).toEqual([]);
    expect(webApiService.listAlbums).toHaveBeenCalledWith(fakeToken, {
      parentAlbumId: 'album-abc',
      pageSize: 10,
      sortBy: undefined,
    });
  });

  it('should handle failure from listAlbums', () => {
    const error = new Error('API failed');
    webApiService.listAlbums.and.returnValue(
      of(toFailure<ListAlbumsResponse>(error)),
    );

    const request: LoadFirstPage = {
      albumId: fakeAlbumId,
      pageSize: 5,
    };
    store.loadInitialPage(of(request));

    expect(store.currentPage()).toEqual(toFailure(error));
    expect(webApiService.listAlbums).toHaveBeenCalled();
  });
});
