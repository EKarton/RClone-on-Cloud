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

import { NAVIGATOR } from '../../app.tokens';
import { HasFailedPipe } from '../../shared/results/pipes/has-failed.pipe';
import { HasSucceededPipe } from '../../shared/results/pipes/has-succeeded.pipe';
import { IsPendingPipe } from '../../shared/results/pipes/is-pending.pipe';
import { Result } from '../../shared/results/results';
import { combineResults2 } from '../../shared/results/utils/combineResults2';
import { GPhotosMediaItem } from '../services/web-api/types/gphotos-media-item';
import { dialogsActions, dialogsState } from '../store/dialogs';
import { FileViewerStore } from './file-viewer.store';
import { FileViewerRequest } from './file-viewer.request';

/** The details to display to the UI. */
interface MediaDetails {
  url: string;
  downloadUrl: string;
  mimeType: string;
  imageAlt: string;
  fileName: string;
  formattedDate: string;
  locationName?: string;
  locationUrl?: string;
}

@Component({
  selector: 'app-file-viewer',
  imports: [CommonModule, IsPendingPipe, HasFailedPipe, HasSucceededPipe],
  templateUrl: './file-viewer.component.html',
  providers: [FileViewerStore],
})
export class FileViewerComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly navigator = inject(NAVIGATOR);
  private readonly subscription = new Subscription();
  private readonly mediaViewerStore = inject(FileViewerStore);

  @ViewChild('modal') myModal?: ElementRef;

  private readonly request$ = this.store.select(
    dialogsState.selectTopDialogRequest(FileViewerRequest),
  );

  readonly isShareSupported = !!this.navigator.share;

  readonly mediaDetailsResult: Signal<Result<MediaDetails>> = computed(() => {
    return combineResults2(
      this.mediaViewerStore.mediaItemResult(),
      this.mediaViewerStore.gMediaItemResult(),
      (mediaItem, gMediaItem) => {
        return {
          url: getUrl(gMediaItem),
          downloadUrl: getDownloadUrl(gMediaItem),
          mimeType: gMediaItem.mimeType,
          imageAlt: `Image of ${mediaItem.fileName}`,
          fileName: mediaItem.fileName,
          formattedDate: mediaItem.dateTaken.toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          locationName: mediaItem.location
            ? `@ ${mediaItem.location?.latitude}, ${mediaItem.location?.longitude}`
            : undefined,
          locationUrl: mediaItem.location
            ? `https://www.google.com/maps/place/${mediaItem.location?.latitude},${mediaItem.location?.longitude}`
            : undefined,
        };
      },
    );
  });

  constructor() {
    this.subscription.add(
      this.request$.subscribe((request) => {
        if (request) {
          this.mediaViewerStore.loadDetails(request.mediaItemId);
        }
      }),
    );
  }

  share(url: string, fileName: string) {
    const shareData = {
      title: fileName,
      text: 'Photo from RClone on Cloud',
      url,
    };

    if (this.navigator.canShare(shareData)) {
      this.navigator.share(shareData);
    } else {
      console.error(`Data ${shareData} cannot be shared.`);
    }
  }

  closeDialog() {
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
    this.subscription.unsubscribe();
  }
}

function getUrl(gMediaItem: GPhotosMediaItem): string {
  if (gMediaItem.mimeType.startsWith('image')) {
    return `${gMediaItem.baseUrl}=w${gMediaItem.mediaMetadata.width}-h${gMediaItem.mediaMetadata.height}`;
  }

  return `${gMediaItem.baseUrl}=dv`;
}

function getDownloadUrl(gMediaItem: GPhotosMediaItem): string {
  if (gMediaItem.mimeType.startsWith('image')) {
    return `${gMediaItem.baseUrl}=d`;
  }

  return `${gMediaItem.baseUrl}=dv`;
}
