import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { distinct, map, mergeMap, switchMap } from 'rxjs/operators';

import { authState } from '../../../auth/store';
import { WebApiService } from '../../services/web-api/web-api.service';
import * as albumsActions from './albums.actions';

@Injectable()
export class AlbumsEffects {
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly webApiService = inject(WebApiService);

  loadAlbumDetails$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(albumsActions.loadAlbumDetails),
      distinct((prop) => prop.albumId),
      mergeMap(({ albumId }) => {
        return this.store.select(authState.selectAuthToken).pipe(
          switchMap((accessToken) => {
            return this.webApiService
              .getAlbum(accessToken, albumId)
              .pipe(
                map((result) =>
                  albumsActions.loadAlbumDetailsResult({ albumId, result }),
                ),
              );
          }),
        );
      }),
    );
  });
}
