import { inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Store } from '@ngrx/store';
import { EMPTY, expand, switchMap, tap } from 'rxjs';

import { authState } from '../../../../auth/store';
import {
  hasSucceed,
  isPending,
  Result,
  toPending,
} from '../../../../shared/results/results';
import { combineResults2 } from '../../../../shared/results/utils/combineResults2';
import { mapResult } from '../../../../shared/results/utils/mapResult';
import { Album } from '../../../services/web-api/types/album';
import {
  ListAlbumsRequest,
  ListAlbumsResponse,
  ListAlbumsSortBy,
} from '../../../services/web-api/types/list-albums';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { addAlbum } from '../../../store/albums/albums.actions';

export interface AlbumsListCardsState {
  albumsResult: Result<Album[]>;
}

export const INITIAL_STATE: AlbumsListCardsState = {
  albumsResult: toPending(),
};

export interface LoadAlbumsRequest {
  albumId: string;
  sortBy?: ListAlbumsSortBy;
}

export const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class AlbumsListCardsStore extends ComponentStore<AlbumsListCardsState> {
  private webApiService = inject(WebApiService);
  private store = inject(Store);

  constructor() {
    super(INITIAL_STATE);
  }

  readonly albumsResult = this.selectSignal((state) => state.albumsResult);

  readonly loadAlbums = this.effect<LoadAlbumsRequest>((request$) =>
    request$.pipe(
      switchMap((request) => {
        this.patchState({
          albumsResult: toPending(),
        });

        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            const apiRequest: ListAlbumsRequest = {
              parentAlbumId: request.albumId!,
              pageSize: DEFAULT_PAGE_SIZE,
              sortBy: request.sortBy,
              pageToken: undefined,
            };

            return this.webApiService.listAlbums(accessToken, apiRequest).pipe(
              expand((response) => {
                if (!hasSucceed(response)) {
                  return EMPTY;
                }

                if (!response.data?.nextPageToken) {
                  return EMPTY;
                }

                const newApiRequest: ListAlbumsRequest = {
                  ...apiRequest,
                  pageToken: response.data?.nextPageToken,
                };

                return this.webApiService.listAlbums(
                  accessToken,
                  newApiRequest,
                );
              }),
              tap((response: Result<ListAlbumsResponse>) => {
                this.addResponse(response);

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

  private readonly addResponse = this.updater(
    (
      state: AlbumsListCardsState,
      response: Result<ListAlbumsResponse>,
    ): AlbumsListCardsState => {
      if (isPending(response)) {
        return state;
      }

      if (isPending(state.albumsResult)) {
        return {
          ...state,
          albumsResult: mapResult(response, (page) => page.albums),
        };
      }

      return {
        ...state,
        albumsResult: combineResults2(
          state.albumsResult,
          response,
          (prev, cur) => [...prev, ...cur.albums],
        ),
      };
    },
  );

  private saveAlbumsToStore(response: ListAlbumsResponse) {
    response.albums.forEach((album) =>
      this.store.dispatch(addAlbum({ album })),
    );
  }
}
