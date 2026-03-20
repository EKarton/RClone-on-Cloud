import { inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Store } from '@ngrx/store';
import { switchMap, tap, withLatestFrom } from 'rxjs';

import { authState } from '../../../auth/store';
import { Result, toPending } from '../../../shared/results/results';
import { mapResult } from '../../../shared/results/utils/mapResult';
import { takeSuccessfulDataOrElse } from '../../../shared/results/utils/takeSuccessfulDataOrElse';
import { BulkGetMediaItemsByIdsRequest } from '../../services/web-api/types/bulk-get-media-items-by-ids';
import { MediaItem } from '../../services/web-api/types/media-item';
import { WebApiService } from '../../services/web-api/web-api.service';

export interface MediaItemsGalleryState {
  mediaItemsResult: Result<MediaItem[]>;
}

export const INITIAL_STATE: MediaItemsGalleryState = {
  mediaItemsResult: toPending(),
};

export interface LoadMediaItems {
  mediaItemIds: string[];
}

@Injectable()
export class MediaItemsGalleryStore extends ComponentStore<MediaItemsGalleryState> {
  private webApiService = inject(WebApiService);
  private store = inject(Store);

  constructor() {
    super(INITIAL_STATE);
  }

  readonly mediaItems = this.selectSignal((state) =>
    takeSuccessfulDataOrElse(state.mediaItemsResult, []),
  );

  readonly loadMediaItems = this.effect<LoadMediaItems>((request$) =>
    request$.pipe(
      withLatestFrom(this.state$),
      switchMap(([request]) => {
        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            this.patchState({
              mediaItemsResult: toPending(),
            });

            const apiRequest: BulkGetMediaItemsByIdsRequest = {
              mediaItemIds: request.mediaItemIds,
            };

            return this.webApiService
              .bulkGetMediaItemsByIds(accessToken, apiRequest)
              .pipe(
                tap((response) => {
                  this.patchState({
                    mediaItemsResult: mapResult(
                      response,
                      (res) => res.mediaItems,
                    ),
                  });
                }),
              );
          }),
        );
      }),
    ),
  );
}
