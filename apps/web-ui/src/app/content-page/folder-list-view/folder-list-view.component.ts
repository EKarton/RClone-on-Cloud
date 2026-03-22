import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';

import { FolderBreadcrumbsComponent } from './folder-breadcrumbs/folder-breadcrumbs.component';
import { REMOTE_PATH$, REMOTE_PATH$_PROVIDER } from './folder-list-view.tokens';
import { RouterModule } from '@angular/router';
import {
  ListAlbumsSortBy,
  ListAlbumsSortByFields,
  ListAlbumsSortDirection,
} from '../services/web-api/types/list-albums';
import {
  FolderDisplayDropdownComponent,
  ListViewOptions,
} from './folder-display-dropdown/folder-display-dropdown.component';
import { FolderListCardsComponent } from './folder-list-cards/folder-list-cards.component';
import { FolderListTableComponent } from './folder-list-table/folder-list-table.component';
import { FolderSortDropdownComponent } from './folder-sort-dropdown/folder-sort-dropdown.component';
import { switchMap } from 'rxjs/operators';
import { WebApiService } from '../services/web-api/web-api.service';
import { Result, toPending } from '../../shared/results/results';
import { ListFolderResponse } from '../services/web-api/types/list-folder';
import { toSignal } from '@angular/core/rxjs-interop';

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
  ],
  templateUrl: './folder-list-view.component.html',
  providers: [REMOTE_PATH$_PROVIDER],
})
export class FolderListViewComponent {
  private readonly remotePath$ = inject(REMOTE_PATH$);
  private readonly webApiService = inject(WebApiService);

  readonly ListViewOptions = ListViewOptions;

  filesSortBy: WritableSignal<ListAlbumsSortBy> = signal({
    field: ListAlbumsSortByFields.NAME,
    direction: ListAlbumsSortDirection.ASCENDING,
  });

  filesListViewOption: WritableSignal<ListViewOptions> = signal(
    ListViewOptions.LIST,
  );

  readonly contentsResult: Signal<Result<ListFolderResponse>> = toSignal(
    this.remotePath$.pipe(
      switchMap(({ remote, path }) =>
        this.webApiService.listFolder(remote, path ?? ''),
      ),
    ),
    { initialValue: toPending<ListFolderResponse>() },
  );
}
