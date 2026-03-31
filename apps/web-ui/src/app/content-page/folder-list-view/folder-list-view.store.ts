import { inject, Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { switchMap, tap } from 'rxjs';
import { Result, toPending } from '../../shared/results/results';
import { ListFolderResponse } from '../services/web-api/types/list-folder';
import { WebApiService } from '../services/web-api/web-api.service';

export interface FolderListViewState {
  items: Result<ListFolderResponse>;
}

export const INITIAL_STATE: FolderListViewState = {
  items: toPending(),
};

export interface ListFolderRequest {
  remote: string;
  dirPath: string;
}

@Injectable()
export class FolderListViewStore extends ComponentStore<FolderListViewState> {
  private webApiService = inject(WebApiService);

  constructor() {
    super(INITIAL_STATE);
  }

  readonly items = this.selectSignal((state) => state.items);

  readonly loadItems = this.effect<ListFolderRequest>((request$) =>
    request$.pipe(
      switchMap((request) => {
        this.patchState({
          items: toPending(),
        });

        return this.webApiService.listFolder(request.remote, request.dirPath).pipe(
          tap((response) => {
            this.patchState({
              items: response,
            });
          }),
        );
      }),
    ),
  );
}
