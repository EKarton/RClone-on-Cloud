import { CommonModule } from '@angular/common';
import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

export enum ListViewOptions {
  LIST = 'list',
  TABLE = 'table',
}

@Component({
  standalone: true,
  selector: 'app-content-albums-list-view-dropdown',
  imports: [CommonModule, FormsModule],
  templateUrl: './albums-list-view-dropdown.component.html',
})
export class AlbumsListViewDropdownComponent {
  readonly listViewOption = model.required<ListViewOptions>();
  readonly ListViewOptions = ListViewOptions;

  setListViewOption(newOption: ListViewOptions) {
    this.listViewOption.update(() => newOption);
  }
}
