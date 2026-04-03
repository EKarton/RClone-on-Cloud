import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Signal,
  signal,
  WritableSignal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { filter, map, scan, switchMap } from 'rxjs/operators';

import { hasSucceed, isPending, Result } from '../../shared/results/results';
import {
  ListAlbumsSortBy,
  ListAlbumsSortByFields,
  ListAlbumsSortDirection,
} from '../services/web-api/types/list-albums';
import { ListFolderResponse } from '../services/web-api/types/list-folder';
import { FolderBreadcrumbsComponent } from './folder-breadcrumbs/folder-breadcrumbs.component';
import {
  FolderDisplayDropdownComponent,
  ListViewOptions,
} from './folder-display-dropdown/folder-display-dropdown.component';
import { FolderListCardsComponent } from './folder-list-cards/folder-list-cards.component';
import { FolderListTableComponent } from './folder-list-table/folder-list-table.component';
import { REMOTE_PATH$, REMOTE_PATH$_PROVIDER } from './folder-list-view.tokens';
import { FolderSortDropdownComponent } from './folder-sort-dropdown/folder-sort-dropdown.component';
import { AddItemsDropdownComponent } from './add-items-dropdown/add-items-dropdown.component';
import { FolderListViewStore } from './folder-list-view.store';
import { Subscription } from 'rxjs';
import { jobsState } from '../store/jobs';
import { Store } from '@ngrx/store';
import { DeleteItemsDialogComponent } from './delete-items-dialog/delete-items-dialog.component';
import { RenameItemsDialogComponent } from './rename-items-dialog/rename-items-dialog.component';
import { MoveItemsDialogComponent } from './move-items-dialog/move-items-dialog.component';
import { CopyItemsDialogComponent } from './copy-items-dialog/copy-items-dialog.component';

@Component({
  standalone: true,
  selector: 'app-files-view',
  imports: [
    CommonModule,
    RouterModule,
    FolderBreadcrumbsComponent,
    FolderDisplayDropdownComponent,
    FolderSortDropdownComponent,
    FolderListCardsComponent,
    FolderListTableComponent,
    AddItemsDropdownComponent,
    DeleteItemsDialogComponent,
    RenameItemsDialogComponent,
    MoveItemsDialogComponent,
    CopyItemsDialogComponent,
  ],
  templateUrl: './folder-list-view.component.html',
  providers: [REMOTE_PATH$_PROVIDER, FolderListViewStore],
})
export class FolderListViewComponent implements OnInit, OnDestroy {
  private readonly remotePath$ = inject(REMOTE_PATH$);
  private readonly folderListViewStore = inject(FolderListViewStore);
  private readonly globalStore = inject(Store);
  private readonly subscriptions = new Subscription();

  readonly ListViewOptions = ListViewOptions;

  filesSortBy: WritableSignal<ListAlbumsSortBy> = signal({
    field: ListAlbumsSortByFields.NAME,
    direction: ListAlbumsSortDirection.ASCENDING,
  });

  filesListViewOption: WritableSignal<ListViewOptions> = signal(ListViewOptions.LIST);

  readonly contentsResult: Signal<Result<ListFolderResponse>> = this.folderListViewStore.items;

  readonly currentFolder = toSignal(
    this.remotePath$.pipe(map(({ remote, path }) => path?.split('/').pop() ?? remote)),
    { initialValue: '' },
  );

  ngOnInit() {
    this.subscriptions.add(
      this.remotePath$.subscribe((remotePath) => {
        this.folderListViewStore.loadItems({
          remote: remotePath.remote,
          dirPath: remotePath.path ?? '',
        });
      }),
    );

    this.subscriptions.add(
      this.remotePath$
        .pipe(
          switchMap((remotePath) => {
            return this.globalStore.select(jobsState.selectAllJobs).pipe(
              scan(
                (state, jobs) => {
                  let hasNewSuccess = false;
                  const pendingFiles = new Set<string | number>(state.pendingFiles);

                  for (const job of jobs) {
                    if (isPending(job.result)) {
                      pendingFiles.add(job.key);
                    } else if (hasSucceed(job.result) && pendingFiles.has(job.key)) {
                      pendingFiles.delete(job.key);
                      hasNewSuccess = true;
                    }
                  }

                  return { pendingFiles, hasNewSuccess };
                },
                { pendingFiles: new Set<string | number>(), hasNewSuccess: false },
              ),
              filter((state) => state.hasNewSuccess),
              map(() => remotePath),
            );
          }),
        )
        .subscribe((remotePath) => {
          console.log('Loading items again');
          this.folderListViewStore.loadItems({
            remote: remotePath.remote,
            dirPath: remotePath.path ?? '',
          });
        }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
