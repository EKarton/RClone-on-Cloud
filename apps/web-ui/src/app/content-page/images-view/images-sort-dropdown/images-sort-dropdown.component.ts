import { CommonModule } from '@angular/common';
import { Component, computed, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ListMediaItemsSortBy,
  ListMediaItemsSortByFields,
  ListMediaItemsSortDirection,
} from '../../services/web-api/types/list-media-items';

@Component({
  standalone: true,
  selector: 'app-content-images-sort-dropdown',
  imports: [CommonModule, FormsModule],
  templateUrl: './images-sort-dropdown.component.html',
})
export class ImagesSortDropdownComponent {
  readonly sortBy = model.required<ListMediaItemsSortBy>();
  readonly SortByFields = ListMediaItemsSortByFields;
  readonly SortDirection = ListMediaItemsSortDirection;

  readonly isAscending = computed(
    () => this.sortBy().direction === ListMediaItemsSortDirection.ASCENDING,
  );

  readonly sortByFieldText = computed(() => {
    switch (this.sortBy().field) {
      case ListMediaItemsSortByFields.ID:
        return 'ID';
      case ListMediaItemsSortByFields.DATE_TAKEN:
        return 'Date Taken';
    }
  });

  setField(field: ListMediaItemsSortByFields) {
    this.sortBy.update((s) => ({ ...s, field }));
  }

  setDirection(direction: ListMediaItemsSortDirection) {
    this.sortBy.update((s) => ({ ...s, direction }));
  }
}
