import { CommonModule } from '@angular/common';
import { Component, inject, input, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Buffer } from 'buffer';
import { switchMap } from 'rxjs';

import { HasFailedPipe } from '../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../shared/results/pipes/is-pending.pipe';
import { Result, toPending } from '../../../shared/results/results';
import { mapResultRxJs } from '../../../shared/results/rxjs/mapResultRxJs';
import { FileViewerRequest } from '../../file-viewer/file-viewer.request';
import { ListAlbumsSortBy } from '../../services/web-api/types/list-albums';
import { ListFolderItem, ListFolderResponse } from '../../services/web-api/types/list-folder';
import { dialogsActions } from '../../store/dialogs';
import { REMOTE_PATH$ } from '../folder-list-view.tokens';
import { FolderItemActionsDropdownComponent } from '../folder-item-actions-dropdown/folder-item-actions-dropdown.component';
import { NoContentMessageComponent } from '../no-content-message/no-content-message.component';

interface Item extends ListFolderItem {
  onClick: () => void;
}

@Component({
  standalone: true,
  selector: 'app-folder-list-cards',
  imports: [
    CommonModule,
    RouterModule,
    HasFailedPipe,
    IsPendingPipe,
    FolderItemActionsDropdownComponent,
    NoContentMessageComponent,
  ],
  templateUrl: './folder-list-cards.component.html',
})
export class FolderListCardsComponent {
  readonly sortBy = input.required<ListAlbumsSortBy>();
  readonly contentsResult = input.required<Result<ListFolderResponse>>();

  private readonly contentsResult$ = toObservable(this.contentsResult);
  private readonly remotePath$ = inject(REMOTE_PATH$);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  readonly itemsResult: Signal<Result<Item[]>> = toSignal(
    this.remotePath$.pipe(
      switchMap(({ remote, path }) => {
        return this.contentsResult$.pipe(
          mapResultRxJs((contents) => {
            return contents.items.map((item) => {
              return {
                ...item,
                onClick: () => {
                  if (item.isDir) {
                    this.router.navigate([
                      '/folders',
                      Buffer.from(`${remote}:${item.path}`).toString('base64').replace(/=/g, ''),
                    ]);
                  } else {
                    this.store.dispatch(
                      dialogsActions.openDialog({
                        request: new FileViewerRequest(
                          remote,
                          path,
                          item.name,
                          item.mimeType ?? '',
                        ),
                      }),
                    );
                  }
                },
              };
            });
          }),
        );
      }),
    ),
    { initialValue: toPending<Item[]>() },
  );
}
