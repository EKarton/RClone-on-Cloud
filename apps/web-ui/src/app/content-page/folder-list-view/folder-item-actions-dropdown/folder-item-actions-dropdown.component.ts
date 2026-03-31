import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { ListFolderItem } from '../../services/web-api/types/list-folder';
import { Store } from '@ngrx/store';
import { jobsActions } from '../../store/jobs';
import { REMOTE_PATH$ } from '../folder-list-view.tokens';
import { toSignal } from '@angular/core/rxjs-interop';
import { dialogsActions } from '../../store/dialogs';
import { DeleteDialogRequest } from './delete-dialog/delete-dialog.request';
import { RenameDialogRequest } from './rename-dialog/rename-dialog.request';
import { MoveDialogRequest } from './move-dialog/move-dialog.request';

@Component({
  standalone: true,
  selector: 'app-folder-item-actions-dropdown',
  imports: [CommonModule],
  templateUrl: './folder-item-actions-dropdown.component.html',
})
export class FolderItemActionsDropdownComponent {
  readonly item = input.required<ListFolderItem>();

  private readonly remotePath = toSignal(inject(REMOTE_PATH$));
  private readonly store = inject(Store);

  move() {
    console.log('move', this.item());
    this.store.dispatch(dialogsActions.openDialog({ request: new MoveDialogRequest(this.item()) }));
  }

  duplicate() {
    console.log('duplicate', this.item());
    this.store.dispatch(
      jobsActions.submitJob({
        request: {
          kind: 'copy-file',
          fromRemote: this.remotePath()!.remote,
          fromPath: this.item().path,
          toRemote: this.remotePath()!.remote,
          toPath: this.item().path,
        },
      }),
    );
  }

  rename() {
    console.log('rename', this.item());
    this.store.dispatch(
      dialogsActions.openDialog({ request: new RenameDialogRequest(this.item()) }),
    );
  }

  delete() {
    console.log('delete', this.item());
    this.store.dispatch(
      dialogsActions.openDialog({ request: new DeleteDialogRequest(this.item()) }),
    );
  }
}
