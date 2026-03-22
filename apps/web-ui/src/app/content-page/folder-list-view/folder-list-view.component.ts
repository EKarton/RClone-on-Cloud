import { CommonModule } from '@angular/common';
import { Component, signal, WritableSignal } from '@angular/core';

import { HasFailedPipe } from '../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../shared/results/pipes/is-pending.pipe';
import { FolderBreadcrumbsComponent } from './folder-breadcrumbs/folder-breadcrumbs.component';
import {
  PATH$_PROVIDER,
  REMOTE$_PROVIDER,
  REMOTE_PATH$_PROVIDER,
} from './folder-list-view.tokens';
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

@Component({
  standalone: true,
  selector: 'app-files-view',
  imports: [
    CommonModule,
    RouterModule,
    HasFailedPipe,
    IsPendingPipe,
    FolderBreadcrumbsComponent,
    FolderDisplayDropdownComponent,
    FolderSortDropdownComponent,
    FolderListCardsComponent,
    FolderListTableComponent,
  ],
  templateUrl: './folder-list-view.component.html',
  providers: [REMOTE_PATH$_PROVIDER, REMOTE$_PROVIDER, PATH$_PROVIDER],
})
export class FolderListViewComponent {
  readonly ListViewOptions = ListViewOptions;

  filesSortBy: WritableSignal<ListAlbumsSortBy> = signal({
    field: ListAlbumsSortByFields.NAME,
    direction: ListAlbumsSortDirection.ASCENDING,
  });

  filesListViewOption: WritableSignal<ListViewOptions> = signal(
    ListViewOptions.LIST,
  );
}
