import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, map, startWith, switchMap, takeWhile } from 'rxjs/operators';

import * as fileUploadsActions from './file-uploads.actions';
import { interval } from 'rxjs';
import { isPending } from '../../../shared/results/results';
import { filterOnlySuccess } from '../../../shared/results/rxjs/filterOnlySuccess';
import { WebApiService } from '../../services/web-api/web-api.service';

@Injectable()
export class FileUploadsEffects {
  private readonly actions$ = inject(Actions);
  private readonly webApiService = inject(WebApiService);

  uploadFile$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fileUploadsActions.uploadFile),
      switchMap(({ request }) => {
        return this.webApiService.uploadFile(request.remote, request.dirPath, request.file).pipe(
          map((result) => {
            return fileUploadsActions.setUploadFileResult({
              request,
              result,
            });
          }),
        );
      }),
    );
  });
}
