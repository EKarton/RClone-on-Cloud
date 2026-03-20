import { CommonModule } from '@angular/common';
import { Component, input, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ListAlbumsSortBy,
  ListAlbumsSortByFields,
  ListAlbumsSortDirection,
} from '../../services/web-api/types/list-albums';
import { AlbumsListCardsComponent } from './albums-list-cards/albums-list-cards.component';
import { AlbumsListTableComponent } from './albums-list-table/albums-list-table.component';
import {
  AlbumsListViewDropdownComponent,
  ListViewOptions,
} from './albums-list-view-dropdown/albums-list-view-dropdown.component';
import { AlbumsSortDropdownComponent } from './albums-sort-dropdown/albums-sort-dropdown.component';

@Component({
  standalone: true,
  selector: 'app-content-albums-list',
  imports: [
    CommonModule,
    FormsModule,
    AlbumsListCardsComponent,
    AlbumsListTableComponent,
    AlbumsSortDropdownComponent,
    AlbumsListViewDropdownComponent,
  ],
  templateUrl: './albums-list.component.html',
})
export class AlbumsListComponent {
  readonly albumId = input.required<string>();
  readonly ListViewOptions = ListViewOptions;

  albumsSortBy: WritableSignal<ListAlbumsSortBy> = signal({
    field: ListAlbumsSortByFields.NAME,
    direction: ListAlbumsSortDirection.ASCENDING,
  });

  albumsListViewOption: WritableSignal<ListViewOptions> = signal(
    ListViewOptions.LIST,
  );
}
