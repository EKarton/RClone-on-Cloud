import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  Signal,
  ViewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { HasFailedPipe } from '../../shared/results/pipes/has-failed.pipe';
import { HasSucceededPipe } from '../../shared/results/pipes/has-succeeded.pipe';
import { IsPendingPipe } from '../../shared/results/pipes/is-pending.pipe';
import { hasSucceed, Result, toSuccess } from '../../shared/results/results';
import { dialogsActions, dialogsState } from '../store/dialogs';
import { AudioViewerComponent } from './audio-viewer/audio-viewer.component';
import { FileViewerRequest } from './file-viewer.request';
import { FileViewerStore } from './file-viewer.store';
import { ImageViewerComponent } from './image-viewer/image-viewer.component';
import { PdfViewerComponent } from './pdf-viewer/pdf-viewer.component';
import { TextViewerComponent } from './text-viewer/text-viewer.component';
import { UnsupportedViewerComponent } from './unsupported-viewer/unsupported-viewer.component';
import { VideoViewerComponent } from './video-viewer/video-viewer.component';

/** Resolved file details for the template. */
interface FileDetails {
  blob: Blob;
  blobUrl: string;
  mimeType: string;
  fileName: string;
}

@Component({
  selector: 'app-file-viewer',
  imports: [
    CommonModule,
    IsPendingPipe,
    HasFailedPipe,
    HasSucceededPipe,
    ImageViewerComponent,
    VideoViewerComponent,
    AudioViewerComponent,
    PdfViewerComponent,
    TextViewerComponent,
    UnsupportedViewerComponent,
  ],
  templateUrl: './file-viewer.component.html',
  providers: [FileViewerStore],
})
export class FileViewerComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly subscription = new Subscription();
  private readonly fileViewerStore = inject(FileViewerStore);

  private currentBlobUrl: string | null = null;

  @ViewChild('modal') myModal?: ElementRef;

  private readonly request$ = this.store.select(
    dialogsState.selectTopDialogRequest(FileViewerRequest),
  );

  /** The current request (for accessing mimeType and fileName in the template). */
  currentRequest: FileViewerRequest | null = null;

  readonly fileDetailsResult: Signal<Result<FileDetails>> = computed(() => {
    const contentResult = this.fileViewerStore.fileContentResult();

    if (!hasSucceed(contentResult) || !this.currentRequest) {
      return contentResult as unknown as Result<FileDetails>;
    }

    // Revoke previous blob URL to prevent memory leaks
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
    }

    const blob = contentResult.data!;
    const blobUrl = URL.createObjectURL(blob);
    this.currentBlobUrl = blobUrl;

    return toSuccess<FileDetails>({
      blob,
      blobUrl,
      mimeType: this.currentRequest.mimeType,
      fileName: this.currentRequest.fileName,
    });
  });

  constructor() {
    this.subscription.add(
      this.request$.subscribe((request) => {
        this.currentRequest = request;
        if (request) {
          this.fileViewerStore.loadFile({
            remote: request.remote,
            dirPath: request.dirPath,
            fileName: request.fileName,
          });
        }
      }),
    );
  }

  closeDialog() {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    this.store.dispatch(dialogsActions.closeDialog());
  }

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

  ngOnDestroy(): void {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
    }
    this.subscription.unsubscribe();
  }
}
