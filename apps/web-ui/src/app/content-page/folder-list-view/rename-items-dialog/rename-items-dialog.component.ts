import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { dialogsActions, dialogsState } from '../../store/dialogs';
import { jobsActions } from '../../store/jobs';
import { REMOTE_PATH$ } from '../folder-list-view.tokens';
import { RenameItemsDialogRequest } from './rename-items-dialog.request';

@Component({
  selector: 'app-rename-items-dialog',
  imports: [CommonModule, FormsModule],
  templateUrl: './rename-items-dialog.component.html',
})
export class RenameItemsDialogComponent implements AfterViewInit {
  private readonly store = inject(Store);
  private readonly remotePath = toSignal(inject(REMOTE_PATH$));
  private readonly subscription = new Subscription();

  @ViewChild('modal') myModal?: ElementRef<HTMLDialogElement>;

  private readonly request$ = this.store.select(
    dialogsState.selectTopDialogRequest(RenameItemsDialogRequest),
  );
  readonly request = toSignal(this.request$);

  newName = '';

  ngAfterViewInit(): void {
    this.subscription.add(
      this.request$.subscribe((request) => {
        queueMicrotask(() => {
          if (request) {
            this.newName = request.item.name;
            this.myModal?.nativeElement?.showModal?.();
          } else {
            this.newName = '';
            this.myModal?.nativeElement?.close?.();
          }
        });
      }),
    );
  }

  confirmRename() {
    const request = this.request();
    const remotePath = this.remotePath();
    const newName = this.newName.trim();

    if (!request || !remotePath || !newName || newName === request.item.name) {
      return;
    }

    if (request.item.isDir) {
      this.store.dispatch(
        jobsActions.submitJob({
          request: {
            kind: 'move-folder',
            fromRemote: remotePath.remote,
            fromPath: request.item.path,
            toRemote: remotePath.remote,
            toPath: remotePath.path ? `${remotePath.path}/${newName}` : newName,
          },
        }),
      );
    } else {
      this.store.dispatch(
        jobsActions.submitJob({
          request: {
            kind: 'move-file',
            fromRemote: remotePath.remote,
            fromPath: request.item.path,
            toRemote: remotePath.remote,
            toPath: remotePath.path ? `${remotePath.path}/${newName}` : newName,
          },
        }),
      );
    }

    this.closeDialog();
  }

  closeDialog() {
    this.store.dispatch(dialogsActions.closeDialog());
  }
}
