import { inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Store } from '@ngrx/store';
import { switchMap, tap } from 'rxjs/operators';

import { authState } from '../../../../../auth/store';
import { Result, toPending } from '../../../../../shared/results/results';
import { switchMapResultToResultRxJs } from '../../../../../shared/results/rxjs/switchMapResultToResultRxJs';
import { GPhotosMediaItem } from '../../../../services/web-api/types/gphotos-media-item';
import { WebApiService } from '../../../../services/web-api/web-api.service';

/** State definition for {@code ImageMapMarkerStore}. */
export interface ImageMapMarkerState {
  gPhotosMediaItem: Result<GPhotosMediaItem>;
}

/** Initial state for {@code ImageMarkerStore}. */
export const INITIAL_STATE: ImageMapMarkerState = {
  gPhotosMediaItem: toPending(),
};

/** Component store for {@code ImageComponent}. */
@Injectable()
export class ImageMapMarkerStore extends ComponentStore<ImageMapMarkerState> {
  private webApiService = inject(WebApiService);
  private store = inject(Store);

  constructor() {
    super(INITIAL_STATE);
  }

  readonly gPhotosMediaItem = this.selectSignal(
    (state) => state.gPhotosMediaItem,
  );

  readonly loadGPhotosMediaItem = this.effect<string>((mediaItemId$) =>
    mediaItemId$.pipe(
      switchMap((mediaItemId) => {
        this.patchState({
          ...INITIAL_STATE,
        });

        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            return this.webApiService
              .getMediaItem(accessToken, mediaItemId)
              .pipe(
                switchMapResultToResultRxJs((mediaItem) => {
                  return this.webApiService.getGPhotosMediaItem(accessToken, {
                    gPhotosMediaItemId: mediaItem.gPhotosMediaItemId,
                  });
                }),
              )
              .pipe(
                tap((response) => {
                  this.patchState({
                    gPhotosMediaItem: response,
                  });
                }),
              );
          }),
        );
      }),
    ),
  );
}
