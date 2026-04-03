import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { REMOTE_PATH$ } from '../folder-list-view.tokens';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { jobsActions } from '../../store/jobs';

@Component({
  standalone: true,
  selector: 'app-add-items-dropdown',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-items-dropdown.component.html',
})
export class AddItemsDropdownComponent {
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly folderInput = viewChild<ElementRef<HTMLInputElement>>('folderInput');
  readonly createFolderDialog = viewChild<ElementRef<HTMLDialogElement>>('createFolderDialog');

  private readonly remotePath = toSignal(inject(REMOTE_PATH$));
  private readonly store = inject(Store);

  newFolderName = '';

  uploadNewFile() {
    this.fileInput()?.nativeElement.click();
  }

  uploadNewFolder() {
    this.folderInput()?.nativeElement.click();
  }

  createNewFolder() {
    this.createFolderDialog()?.nativeElement.showModal();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const remotePath = this.remotePath();
    if (!remotePath) {
      return;
    }

    this.store.dispatch(
      jobsActions.submitJob({
        request: {
          kind: 'upload-file',
          remote: remotePath.remote,
          dirPath: remotePath.path,
          file,
        },
      }),
    );

    input.value = '';
  }

  onFolderSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    const remotePath = this.remotePath();
    if (!remotePath) {
      return;
    }

    files.forEach((file) => {
      const relativePath = this.getWebkitRelativePath(file);
      const targetDir = this.getTargetDirectory(relativePath);

      this.store.dispatch(
        jobsActions.submitJob({
          request: {
            kind: 'upload-file',
            remote: remotePath.remote,
            dirPath: this.joinRemotePath(remotePath.path ?? '', targetDir),
            file,
          },
        }),
      );
    });

    input.value = '';
  }

  openCreateFolderDialog() {
    this.newFolderName = '';
    this.createFolderDialog()?.nativeElement.showModal();
  }

  closeCreateFolderDialog() {
    this.createFolderDialog()?.nativeElement.close();
  }

  submitCreateFolder() {
    this.closeCreateFolderDialog();

    const folderName = this.newFolderName.trim();
    if (!folderName) {
      return;
    }

    const remotePath = this.remotePath();
    if (!remotePath) {
      return;
    }

    const dirPath = this.joinRemotePath(remotePath.path ?? '', folderName);

    this.store.dispatch(
      jobsActions.submitJob({
        request: {
          kind: 'mkdir',
          remote: remotePath.remote,
          dirPath,
        },
      }),
    );
  }

  private getWebkitRelativePath(file: File): string {
    return (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name;
  }

  private getTargetDirectory(webkitRelativePath: string): string {
    const parts = webkitRelativePath.split('/');
    return parts.slice(0, -1).join('/');
  }

  private joinRemotePath(basePath: string, childPath: string): string {
    if (!basePath) {
      return childPath;
    }
    if (!childPath) {
      return basePath;
    }
    return `${basePath}/${childPath}`;
  }
}
