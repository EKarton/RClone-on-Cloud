import { CommonModule } from '@angular/common';
import { Component, computed, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ListAlbumsSortBy,
  ListAlbumsSortByFields,
  ListAlbumsSortDirection,
} from '../../services/web-api/types/list-albums';

@Component({
  standalone: true,
  selector: 'app-folder-sort-dropdown',
  imports: [CommonModule, FormsModule],
  templateUrl: './folder-sort-dropdown.component.html',
})
export class FolderSortDropdownComponent {
  readonly sortBy = model.required<ListAlbumsSortBy>();
  readonly ListAlbumsSortByFields = ListAlbumsSortByFields;
  readonly ListAlbumsSortDirection = ListAlbumsSortDirection;

  readonly isAscending = computed(
    () => this.sortBy().direction === ListAlbumsSortDirection.ASCENDING,
  );

  readonly sortByFieldText = computed(() => {
    switch (this.sortBy().field) {
      case ListAlbumsSortByFields.ID:
        return 'ID';
      case ListAlbumsSortByFields.NAME:
        return 'Name';
    }
  });

  setField(field: ListAlbumsSortByFields) {
    this.sortBy.update((s) => ({ ...s, field }));
  }

  setDirection(direction: ListAlbumsSortDirection) {
    this.sortBy.update((s) => ({ ...s, direction }));
  }
}
