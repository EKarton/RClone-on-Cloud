import { inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { switchMap, tap } from 'rxjs/operators';

import { Result, toPending } from '../../shared/results/results';
import { WebApiService } from '../services/web-api/web-api.service';

/** The state definition for {@code FileViewerStore} */
export interface FileViewerState {
  fileContentResult: Result<Blob>;
}

/** The initial state for the {@code FileViewerStore} */
export const INITIAL_STATE: FileViewerState = {
  fileContentResult: toPending(),
};

/** A component store for the {@code FileViewerComponent} */
@Injectable()
export class FileViewerStore extends ComponentStore<FileViewerState> {
  private readonly webApiService = inject(WebApiService);

  constructor() {
    super(INITIAL_STATE);
  }

  readonly fileContentResult = this.selectSignal(
    (state) => state.fileContentResult,
  );

  private readonly setFileContentResult = this.updater(
    (state: FileViewerState, response: Result<Blob>): FileViewerState => ({
      ...state,
      fileContentResult: response,
    }),
  );

  readonly loadFile = this.effect<{
    remote: string;
    dirPath: string | undefined;
    fileName: string;
  }>((params$) =>
    params$.pipe(
      switchMap(({ remote, dirPath, fileName }) => {
        this.patchState({ fileContentResult: toPending() });

        return this.webApiService
          .fetchFileContent(remote, dirPath, fileName)
          .pipe(tap((result) => this.setFileContentResult(result)));
      }),
    ),
  );
}
