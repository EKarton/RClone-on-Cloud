import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { dialogsActions, dialogsState } from '../../store/dialogs';
import { DeleteItemsDialogRequest } from './delete-items-dialog.request';
import { jobsActions } from '../../store/jobs';
import { toSignal } from '@angular/core/rxjs-interop';
import { REMOTE_PATH$ } from '../folder-list-view.tokens';

@Component({
  selector: 'app-delete-items-dialog',
  imports: [CommonModule],
  templateUrl: './delete-items-dialog.component.html',
})
export class DeleteItemsDialogComponent implements AfterViewInit {
  private readonly store = inject(Store);
  private readonly remotePath = toSignal(inject(REMOTE_PATH$));
  private readonly subscription = new Subscription();

  @ViewChild('modal') myModal?: ElementRef;

  private readonly request$ = this.store.select(
    dialogsState.selectTopDialogRequest(DeleteItemsDialogRequest),
  );
  readonly request = toSignal(this.request$);

  ngAfterViewInit(): void {
    this.subscription.add(
      this.request$.subscribe((request) => {
        queueMicrotask(() => {
          if (request) {
            this.myModal?.nativeElement?.showModal?.();
          } else {
            this.myModal?.nativeElement?.close?.();
          }
        });
      }),
    );
  }

  confirmDelete() {
    if (this.request() && this.remotePath()) {
      if (this.request()!.item.isDir) {
        this.store.dispatch(
          jobsActions.submitJob({
            request: {
              kind: 'delete-folder',
              remote: this.remotePath()!.remote,
              path: this.request()!.item.path,
            },
          }),
        );
      } else {
        this.store.dispatch(
          jobsActions.submitJob({
            request: {
              kind: 'delete-file',
              remote: this.remotePath()!.remote,
              path: this.request()!.item.path,
            },
          }),
        );
      }
    }
  }

  closeDialog() {
    this.store.dispatch(dialogsActions.closeDialog());
  }
}
