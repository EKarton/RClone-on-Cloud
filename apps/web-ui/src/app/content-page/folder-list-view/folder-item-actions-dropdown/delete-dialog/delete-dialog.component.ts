import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { dialogsActions, dialogsState } from '../../../store/dialogs';
import { DeleteDialogRequest } from './delete-dialog.request';
import { jobsActions } from '../../../store/jobs';
import { toSignal } from '@angular/core/rxjs-interop';
import { REMOTE_PATH$ } from '../../folder-list-view.tokens';

@Component({
  selector: 'app-delete-dialog',
  imports: [CommonModule],
  templateUrl: './delete-dialog.component.html',
})
export class DeleteDialogComponent implements AfterViewInit {
  private readonly store = inject(Store);
  private readonly remotePath = toSignal(inject(REMOTE_PATH$));
  private readonly subscription = new Subscription();

  @ViewChild('modal') myModal?: ElementRef;

  private readonly request$ = this.store.select(
    dialogsState.selectTopDialogRequest(DeleteDialogRequest),
  );
  readonly request = toSignal(this.request$);

  ngAfterViewInit(): void {
    this.subscription.add(
      this.request$.subscribe((request) => {
        if (request) {
          this.myModal?.nativeElement?.showModal();
        } else {
          this.myModal?.nativeElement?.close();
        }
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
