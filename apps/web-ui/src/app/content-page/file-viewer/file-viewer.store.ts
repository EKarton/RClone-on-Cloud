import { inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Store } from '@ngrx/store';
import { switchMap, tap } from 'rxjs/operators';

import { authState } from '../../auth/store';
import { Result, toPending } from '../../shared/results/results';
import { switchMapResultToResultRxJs } from '../../shared/results/rxjs/switchMapResultToResultRxJs';
import { GetGPhotosMediaItemDetailsResponse } from '../services/web-api/types/gphotos-media-item';
import { GPhotosMediaItem } from '../services/web-api/types/gphotos-media-item';
import { MediaItemDetailsApiResponse } from '../services/web-api/types/media-item';
import { MediaItem } from '../services/web-api/types/media-item';
import { WebApiService } from '../services/web-api/web-api.service';

/** The state definition for {@code FileViewerStore} */
export interface FileViewerState {
  mediaItemResult: Result<MediaItem>;
  gMediaItemResult: Result<GPhotosMediaItem>;
}

/** The initial state for the {@code FileViewerStore} */
export const INITIAL_STATE: FileViewerState = {
  mediaItemResult: toPending(),
  gMediaItemResult: toPending(),
};

/** A component store for the {@code FileViewerComponent} */
@Injectable()
export class FileViewerStore extends ComponentStore<FileViewerState> {
  private readonly store = inject(Store);
  private readonly webApiService = inject(WebApiService);

  constructor() {
    super(INITIAL_STATE);
  }

  readonly mediaItemResult = this.selectSignal(
    (state) => state.mediaItemResult,
  );
  readonly gMediaItemResult = this.selectSignal(
    (state) => state.gMediaItemResult,
  );

  private readonly clearStates = this.updater(
    (): FileViewerState => ({
      ...INITIAL_STATE,
    }),
  );

  private readonly setMediaItemResult = this.updater(
    (
      state: FileViewerState,
      response: Result<MediaItemDetailsApiResponse>,
    ): FileViewerState => ({
      ...state,
      mediaItemResult: response,
    }),
  );

  private readonly setGMediaItemResult = this.updater(
    (
      state: FileViewerState,
      response: Result<GetGPhotosMediaItemDetailsResponse>,
    ): FileViewerState => ({
      ...state,
      gMediaItemResult: response,
    }),
  );

  readonly loadDetails = this.effect<string>((mediaItemId$) =>
    mediaItemId$.pipe(
      switchMap((mediaItemId) => {
        this.clearStates();

        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            return this.webApiService
              .getMediaItem(accessToken, mediaItemId)
              .pipe(
                tap((mediaItemResult) =>
                  this.setMediaItemResult(mediaItemResult),
                ),
                switchMapResultToResultRxJs((mediaItem) => {
                  return this.webApiService
                    .getGPhotosMediaItem(accessToken, {
                      gPhotosMediaItemId: mediaItem.gPhotosMediaItemId,
                    })
                    .pipe(
                      tap((gMediaItemResult) =>
                        this.setGMediaItemResult(gMediaItemResult),
                      ),
                    );
                }),
              );
          }),
        );
      }),
    ),
  );
}
