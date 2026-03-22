import { CommonModule } from '@angular/common';
import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

export enum ListViewOptions {
  LIST = 'list',
  TABLE = 'table',
}

@Component({
  standalone: true,
  selector: 'app-folder-display-dropdown',
  imports: [CommonModule, FormsModule],
  templateUrl: './folder-display-dropdown.component.html',
})
export class FolderDisplayDropdownComponent {
  readonly listViewOption = model.required<ListViewOptions>();
  readonly ListViewOptions = ListViewOptions;

  setListViewOption(newOption: ListViewOptions) {
    this.listViewOption.update(() => newOption);
  }
}
