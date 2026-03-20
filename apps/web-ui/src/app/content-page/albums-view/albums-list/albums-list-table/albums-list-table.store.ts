import { inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Store } from '@ngrx/store';
import { EMPTY, switchMap, tap, withLatestFrom } from 'rxjs';

import { authState } from '../../../../auth/store';
import {
  hasSucceed,
  Result,
  toFailure,
  toPending,
} from '../../../../shared/results/results';
import {
  ListAlbumsRequest,
  ListAlbumsResponse,
  ListAlbumsSortBy,
} from '../../../services/web-api/types/list-albums';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { addAlbum } from '../../../store/albums/albums.actions';

export interface AlbumsListTableState {
  albumId: string;
  currentPage: Result<ListAlbumsResponse>;
  previousPageTokens: (string | undefined)[];
  currentPageToken?: string;
  pageSize?: number;
  pageNumber: number;
  sortBy?: ListAlbumsSortBy;
}

export const INITIAL_STATE: AlbumsListTableState = {
  albumId: '',
  currentPage: toFailure(new Error('Random error happened')),
  previousPageTokens: [],
  currentPageToken: undefined,
  pageSize: undefined,
  pageNumber: 1,
  sortBy: undefined,
};

export interface LoadFirstPage {
  albumId: string;
  pageSize?: number;
  sortBy?: ListAlbumsSortBy;
}

@Injectable()
export class AlbumsListTableStore extends ComponentStore<AlbumsListTableState> {
  private webApiService = inject(WebApiService);
  private store = inject(Store);

  constructor() {
    super(INITIAL_STATE);
  }

  readonly currentPage = this.selectSignal((state) => state.currentPage);

  readonly pageNumber = this.selectSignal((state) => state.pageNumber);

  readonly loadInitialPage = this.effect<LoadFirstPage>((request$) =>
    request$.pipe(
      withLatestFrom(this.state$),
      switchMap(([request]) => {
        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            const apiRequest: ListAlbumsRequest = {
              parentAlbumId: request.albumId,
              pageSize: request.pageSize,
              sortBy: request.sortBy,
            };

            this.patchState({
              albumId: request.albumId,
              currentPage: toPending(),
              previousPageTokens: [],
              currentPageToken: undefined,
              pageSize: request.pageSize,
              pageNumber: 1,
              sortBy: request.sortBy,
            });

            return this.webApiService.listAlbums(accessToken, apiRequest).pipe(
              tap((response) => {
                this.patchState({
                  currentPage: response,
                });

                if (hasSucceed(response)) {
                  this.saveAlbumsToStore(response.data!);
                }
              }),
            );
          }),
        );
      }),
    ),
  );

  readonly goToFirstPage = this.effect((request$) =>
    request$.pipe(
      withLatestFrom(this.state$),
      switchMap(([, state]) => {
        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            const apiRequest: ListAlbumsRequest = {
              parentAlbumId: state.albumId,
              pageSize: state.pageSize,
              sortBy: state.sortBy,
            };

            this.patchState({
              currentPage: toPending(),
              previousPageTokens: [],
              currentPageToken: undefined,
              pageNumber: 1,
            });

            return this.webApiService.listAlbums(accessToken, apiRequest).pipe(
              tap((response) => {
                this.patchState({
                  currentPage: response,
                });

                if (hasSucceed(response)) {
                  this.saveAlbumsToStore(response.data!);
                }
              }),
            );
          }),
        );
      }),
    ),
  );

  readonly goToPreviousPage = this.effect((request$) =>
    request$.pipe(
      withLatestFrom(this.state$),
      switchMap(([, state]) => {
        if (state.previousPageTokens.length === 0) {
          return EMPTY;
        }

        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            const apiRequest: ListAlbumsRequest = {
              parentAlbumId: state.albumId,
              pageToken: state.previousPageTokens.at(-1),
              pageSize: state.pageSize,
              sortBy: state.sortBy,
            };

            this.patchState({
              currentPage: toPending(),
              previousPageTokens: state.previousPageTokens.slice(0, -1),
              currentPageToken: apiRequest.pageToken,
              pageNumber: state.pageNumber - 1,
            });

            return this.webApiService.listAlbums(accessToken, apiRequest).pipe(
              tap((response) => {
                this.patchState({
                  currentPage: response,
                });

                if (hasSucceed(response)) {
                  this.saveAlbumsToStore(response.data!);
                }
              }),
            );
          }),
        );
      }),
    ),
  );

  readonly goToNextPage = this.effect((request$) =>
    request$.pipe(
      withLatestFrom(this.state$),
      switchMap(([, state]) => {
        if (!state.currentPage.data?.nextPageToken) {
          return EMPTY;
        }

        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            const apiRequest: ListAlbumsRequest = {
              parentAlbumId: state.albumId,
              pageToken: state.currentPage.data?.nextPageToken,
              pageSize: state.pageSize,
              sortBy: state.sortBy,
            };

            this.patchState({
              currentPage: toPending(),
              previousPageTokens: [
                ...state.previousPageTokens,
                state.currentPageToken,
              ],
              currentPageToken: apiRequest.pageToken,
              pageNumber: state.pageNumber + 1,
            });

            return this.webApiService.listAlbums(accessToken, apiRequest).pipe(
              tap((response) => {
                this.patchState({
                  currentPage: response,
                });

                if (hasSucceed(response)) {
                  this.saveAlbumsToStore(response.data!);
                }
              }),
            );
          }),
        );
      }),
    ),
  );

  private saveAlbumsToStore(response: ListAlbumsResponse) {
    response.albums.forEach((album) =>
      this.store.dispatch(addAlbum({ album })),
    );
  }
}
