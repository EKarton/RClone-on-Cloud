import { inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { Store } from '@ngrx/store';
import {
  from,
  map,
  mergeMap,
  switchMap,
  tap,
  toArray,
  withLatestFrom,
} from 'rxjs';

import { authState } from '../../../auth/store';
import { Result, toPending } from '../../../shared/results/results';
import { combineResults } from '../../../shared/results/utils/combineResults';
import { mapResult } from '../../../shared/results/utils/mapResult';
import {
  GetHeatmapRequest,
  Heatmap,
} from '../../services/web-api/types/heatmap';
import { WebApiService } from '../../services/web-api/web-api.service';
import { TileId } from './images-map-viewer/images-map-viewer.component';

export interface ImagesMapState {
  heatmapResult: Result<Heatmap>;
  numTiles: number;
}

export const INITIAL_STATE: ImagesMapState = {
  heatmapResult: toPending(),
  numTiles: 0,
};

export interface LoadTilesRequest {
  tileIds: TileId[];
  albumId?: string;
}

export const DEFAULT_DELAY_BETWEEN_PAGES = 150;

export const MAX_CONCURRENCY = 4;

@Injectable()
export class ImagesMapStore extends ComponentStore<ImagesMapState> {
  private webApiService = inject(WebApiService);
  private store = inject(Store);

  constructor() {
    super(INITIAL_STATE);
  }

  readonly heatmapResult = this.selectSignal((state) => state.heatmapResult);

  readonly numTiles = this.selectSignal((state) => state.numTiles);

  readonly loadTiles = this.effect<LoadTilesRequest>((request$) =>
    request$.pipe(
      withLatestFrom(this.state$),
      switchMap(([request]) => {
        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            this.patchState({
              heatmapResult: toPending(),
              numTiles: request.tileIds.length,
            });

            const apiRequests: GetHeatmapRequest[] = request.tileIds.map(
              (tileId) => ({
                x: tileId.x,
                y: tileId.y,
                z: tileId.z,
                albumId: request.albumId,
              }),
            );

            return from(apiRequests)
              .pipe(
                mergeMap(
                  (apiRequest) =>
                    this.webApiService.getHeatmap(accessToken, apiRequest),
                  MAX_CONCURRENCY,
                ),
                toArray(),
                map((results) =>
                  combineResults(results, (heatmaps) => heatmaps),
                ),
              )
              .pipe(
                tap((result: Result<Heatmap[]>) => {
                  this.patchState({
                    heatmapResult: mapResult(result, (heatmaps) => ({
                      points: heatmaps.map((h) => h.points).flat(),
                    })),
                  });
                }),
              );
          }),
        );
      }),
    ),
  );
}
