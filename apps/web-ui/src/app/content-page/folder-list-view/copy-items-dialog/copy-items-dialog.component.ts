import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { dialogsActions, dialogsState } from '../../store/dialogs';
import { jobsActions } from '../../store/jobs';
import { REMOTE_PATH$ } from '../folder-list-view.tokens';
import { CopyItemsDialogRequest } from './copy-items-dialog.request';

@Component({
  selector: 'app-copy-items-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './copy-items-dialog.component.html',
})
export class CopyItemsDialogComponent implements AfterViewInit {
  private readonly store = inject(Store);
  private readonly remotePath = toSignal(inject(REMOTE_PATH$));
  private readonly subscription = new Subscription();

  @ViewChild('modal') myModal?: ElementRef<HTMLDialogElement>;

  private readonly request$ = this.store.select(
    dialogsState.selectTopDialogRequest(CopyItemsDialogRequest),
  );
  readonly request = toSignal(this.request$);

  destinationPath = '';

  ngAfterViewInit(): void {
    this.subscription.add(
      this.request$.subscribe((request) => {
        queueMicrotask(() => {
          if (request) {
            this.destinationPath = this.remotePath()?.path ?? '';
            this.myModal?.nativeElement?.showModal?.();
          } else {
            this.destinationPath = '';
            this.myModal?.nativeElement?.close?.();
          }
        });
      }),
    );
  }

  confirmCopy() {
    const request = this.request();
    const remotePath = this.remotePath();

    if (!request || !remotePath) {
      return;
    }

    const destinationPath = this.normalizePath(this.destinationPath);
    const itemName = request.item.name;
    const finalPath = this.joinPath(destinationPath, itemName);

    if (request.item.isDir) {
      this.store.dispatch(
        jobsActions.submitJob({
          request: {
            kind: 'copy-folder',
            fromRemote: remotePath.remote,
            fromPath: request.item.path,
            toRemote: remotePath.remote,
            toPath: finalPath,
            createEmptySrcDirs: false,
          },
        }),
      );
    } else {
      this.store.dispatch(
        jobsActions.submitJob({
          request: {
            kind: 'copy-file',
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
    if (!request) {
      return '';
    }

    const destinationPath = this.normalizePath(this.destinationPath);
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
