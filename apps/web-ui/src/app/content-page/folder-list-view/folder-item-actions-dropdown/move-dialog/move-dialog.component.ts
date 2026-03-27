import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { dialogsActions, dialogsState } from '../../../store/dialogs';
import { jobsActions } from '../../../store/jobs';
import { REMOTE_PATH$ } from '../../folder-list-view.tokens';
import { MoveDialogRequest } from './move-dialog.request';

@Component({
  selector: 'app-move-dialog',
  imports: [CommonModule, FormsModule],
  templateUrl: './move-dialog.component.html',
})
export class MoveDialogComponent implements AfterViewInit {
  private readonly store = inject(Store);
  private readonly remotePath = toSignal(inject(REMOTE_PATH$));
  private readonly subscription = new Subscription();

  @ViewChild('modal') myModal?: ElementRef<HTMLDialogElement>;

  private readonly request$ = this.store.select(
    dialogsState.selectTopDialogRequest(MoveDialogRequest),
  );
  readonly request = toSignal(this.request$);

  destinationPath = '';

  ngAfterViewInit(): void {
    this.subscription.add(
      this.request$.subscribe((request) => {
        if (request) {
          this.destinationPath = this.remotePath()?.path ?? '';
          this.myModal?.nativeElement?.showModal();
        } else {
          this.destinationPath = '';
          this.myModal?.nativeElement?.close();
        }
      }),
    );
  }

  confirmMove() {
    const request = this.request();
    const remotePath = this.remotePath();
    const destinationPath = this.normalizePath(this.destinationPath);

    if (!request || !remotePath || !destinationPath) {
      return;
    }

    const itemName = request.item.name;
    const finalPath = this.joinPath(destinationPath, itemName);

    if (request.item.isDir) {
      this.store.dispatch(
        jobsActions.submitJob({
          request: {
            kind: 'move-folder',
            fromRemote: remotePath.remote,
            fromPath: request.item.path,
            toRemote: remotePath.remote,
            toPath: finalPath,
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
            toPath: finalPath,
          },
        }),
      );
    }

    this.closeDialog();
  }

  closeDialog() {
    this.store.dispatch(dialogsActions.closeDialog());
  }

  getPreviewPath(): string {
    const request = this.request();
    const destinationPath = this.normalizePath(this.destinationPath);

    if (!request || !destinationPath) {
      return '';
    }

    return this.joinPath(destinationPath, request.item.name);
  }

  private normalizePath(path: string): string {
    const trimmed = path.trim();
    if (!trimmed) {
      return '';
    }
    return trimmed.replace(/\/+$/, '');
  }

  private joinPath(basePath: string, name: string): string {
    if (!basePath || basePath === '/') {
      return `/${name}`;
    }
    return `${basePath}/${name}`;
  }
}
