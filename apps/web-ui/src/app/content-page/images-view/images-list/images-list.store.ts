import { inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Store } from '@ngrx/store';
import { EMPTY, switchMap, tap, withLatestFrom } from 'rxjs';

import { authState } from '../../../auth/store';
import { hasFailed, isPending, Result } from '../../../shared/results/results';
import { ListMediaItemsResponse } from '../../services/web-api/types/list-media-items';
import { ListMediaItemsRequest } from '../../services/web-api/types/list-media-items';
import { ListMediaItemsSortBy } from '../../services/web-api/types/list-media-items';
import { MediaItem } from '../../services/web-api/types/media-item';
import { WebApiService } from '../../services/web-api/web-api.service';

export interface ImagesListState {
  albumId?: string;
  mediaItems: MediaItem[];
  nextPageToken?: string;
  isAtEndOfList: boolean;
  pageSize?: number;
  sortBy?: ListMediaItemsSortBy;
}

export const INITIAL_STATE: ImagesListState = {
  albumId: undefined,
  mediaItems: [],
  nextPageToken: undefined,
  isAtEndOfList: false,
  pageSize: undefined,
  sortBy: undefined,
};

export interface LoadInitialPageRequest {
  albumId?: string;
  pageSize?: number;
  sortBy?: ListMediaItemsSortBy;
}

@Injectable()
export class ImagesListStore extends ComponentStore<ImagesListState> {
  private webApiService = inject(WebApiService);
  private store = inject(Store);

  constructor() {
    super(INITIAL_STATE);
  }

  readonly mediaItems = this.selectSignal((state) => state.mediaItems);

  private readonly setNewPage = this.updater(
    (
      _: ImagesListState,
      {
        request,
        response,
      }: {
        request: ListMediaItemsRequest;
        response: Result<ListMediaItemsResponse>;
      },
    ): ImagesListState => {
      if (isPending(response) || hasFailed(response)) {
        return {
          albumId: request.albumId,
          mediaItems: [],
          nextPageToken: undefined,
          isAtEndOfList: false,
          pageSize: request.pageSize,
          sortBy: request.sortBy,
        };
      } else {
        const newPage = response.data!;
        return {
          albumId: request.albumId,
          mediaItems: newPage.mediaItems,
          nextPageToken: newPage.nextPageToken,
          isAtEndOfList: newPage.nextPageToken === undefined,
          pageSize: request.pageSize,
          sortBy: request.sortBy,
        };
      }
    },
  );

  private readonly appendMediaItems = this.updater(
    (
      state: ImagesListState,
      response: Result<ListMediaItemsResponse>,
    ): ImagesListState => {
      if (isPending(response) || hasFailed(response)) {
        return { ...state };
      } else {
        const newPage = response.data!;
        return {
          ...state,
          mediaItems: state.mediaItems.concat(...newPage.mediaItems),
          nextPageToken: newPage.nextPageToken,
          isAtEndOfList: newPage.nextPageToken === undefined,
        };
      }
    },
  );

  readonly loadInitialPage = this.effect<LoadInitialPageRequest>((request$) =>
    request$.pipe(
      switchMap((request) => {
        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            const apiRequest: ListMediaItemsRequest = {
              albumId: request.albumId,
              pageSize: request.pageSize,
              sortBy: request.sortBy,
              pageToken: undefined,
            };
            return this.webApiService
              .listMediaItems(accessToken, apiRequest)
              .pipe(
                tap((response) =>
                  this.setNewPage({ request: apiRequest, response }),
                ),
              );
          }),
        );
      }),
    ),
  );

  readonly loadMoreMediaItems = this.effect((request$) =>
    request$.pipe(
      withLatestFrom(this.state$),
      switchMap(([, state]) => {
        if (state.isAtEndOfList) {
          return EMPTY;
        }

        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            const apiRequest: ListMediaItemsRequest = {
              albumId: state.albumId,
              pageSize: state.pageSize,
              sortBy: state.sortBy,
              pageToken: state.nextPageToken,
            };
            return this.webApiService
              .listMediaItems(accessToken, apiRequest)
              .pipe(tap((response) => this.appendMediaItems(response)));
          }),
        );
      }),
    ),
  );
}
