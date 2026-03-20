import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { InViewportModule } from 'ng-in-viewport';

import { WINDOW } from '../../../../app.tokens';
import { HasFailedPipe } from '../../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../../shared/results/pipes/is-pending.pipe';
import { mapResult } from '../../../../shared/results/utils/mapResult';
import { MediaViewerRequest } from '../../../media-viewer/media-viewer.request';
import { GPhotosMediaItem } from '../../../services/web-api/types/gphotos-media-item';
import { dialogsActions } from '../../../store/dialogs';
import { ImageStore } from './image.store';

export interface ImageData {
  id: string;
  baseUrl: string;
  fileName: string;
  onClick: (event: MouseEvent) => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

@Component({
  selector: 'app-image',
  imports: [InViewportModule, HasFailedPipe, IsPendingPipe],
  templateUrl: './image.component.html',
  providers: [ImageStore],
})
export class ImageComponent {
  readonly mediaItemId = input.required<string>();
  readonly gPhotosMediaItemId = input.required<string>();
  readonly fileName = input.required<string>();
  readonly width = input.required<number>();
  readonly height = input.required<number>();

  private readonly store = inject(Store);
  private readonly imageStore = inject(ImageStore);
  private readonly window = inject(WINDOW);

  private readonly isInViewport = signal(false);

  readonly imageDataResult = computed(() => {
    const gMediaItemResult = this.imageStore.gPhotosMediaItem();

    return mapResult(gMediaItemResult, (gMediaItem) => {
      return {
        baseUrl: gMediaItem.baseUrl!,
        onClick: (event: MouseEvent) => {
          if (event.ctrlKey) {
            this.openImageInNewTab(gMediaItem);
          } else {
            this.openImageInDialog(this.mediaItemId());
          }
        },
        onKeyDown: (event: KeyboardEvent) => {
          if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            this.openImageInNewTab(gMediaItem);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            this.openImageInDialog(this.mediaItemId());
          }
        },
      };
    });
  });

  constructor() {
    effect(() => {
      if (this.isInViewport()) {
        this.imageStore.loadGPhotosMediaItemDetails(this.gPhotosMediaItemId());
      }
    });
  }

  setIsInViewport(visible: boolean) {
    this.isInViewport.set(visible);
  }

  private openImageInNewTab(detail: GPhotosMediaItem) {
    const width = detail.mediaMetadata.width;
    const height = detail.mediaMetadata.height;
    const fullPageUrl = `${detail.baseUrl}=w${width}-h${height}`;
    this.window.open(fullPageUrl, '_blank');
  }

  private openImageInDialog(mediaItemId: string) {
    this.store.dispatch(
      dialogsActions.openDialog({
        request: new MediaViewerRequest(mediaItemId),
      }),
    );
  }
}
