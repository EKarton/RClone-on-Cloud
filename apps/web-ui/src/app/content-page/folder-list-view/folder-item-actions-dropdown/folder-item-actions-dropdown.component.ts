import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { ListFolderItem } from '../../services/web-api/types/list-folder';
import { Store } from '@ngrx/store';
import { dialogsActions } from '../../store/dialogs';
import { DeleteItemsDialogRequest } from '../delete-items-dialog/delete-items-dialog.request';
import { RenameItemsDialogRequest } from '../rename-items-dialog/rename-items-dialog.request';
import { MoveItemsDialogRequest } from '../move-items-dialog/move-items-dialog.request';
import { CopyItemsDialogRequest } from '../copy-items-dialog/copy-items-dialog.request';

@Component({
  standalone: true,
  selector: 'app-folder-item-actions-dropdown',
  imports: [CommonModule],
  templateUrl: './folder-item-actions-dropdown.component.html',
})
export class FolderItemActionsDropdownComponent {
  readonly item = input.required<ListFolderItem>();

  private readonly store = inject(Store);

  move() {
    this.store.dispatch(
      dialogsActions.openDialog({ request: new MoveItemsDialogRequest(this.item()) }),
    );
  }

  copy() {
    this.store.dispatch(
      dialogsActions.openDialog({ request: new CopyItemsDialogRequest(this.item()) }),
    );
  }

  rename() {
    this.store.dispatch(
      dialogsActions.openDialog({ request: new RenameItemsDialogRequest(this.item()) }),
    );
  }

  delete() {
    this.store.dispatch(
      dialogsActions.openDialog({ request: new DeleteItemsDialogRequest(this.item()) }),
    );
  }
}
