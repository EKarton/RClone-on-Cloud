import {
  Component,
  computed,
  effect,
  inject,
  input,
  Signal,
  signal,
} from '@angular/core';

import { ImageComponent } from '../../images-view/images-list/image/image.component';
import { MediaItem } from '../../services/web-api/types/media-item';
import { MediaItemsGalleryStore } from './media-items-gallery.store';

@Component({
  selector: 'app-chat-dialog-media-items-gallery',
  templateUrl: './media-items-gallery.component.html',
  imports: [ImageComponent],
  providers: [MediaItemsGalleryStore],
})
export class MediaItemsGalleryComponent {
  readonly mediaItemIds = input.required<string[]>();
  readonly isExpanded = signal(false);

  private readonly componentStore = inject(MediaItemsGalleryStore);

  readonly mediaItemsToDisplay: Signal<MediaItem[]> = computed(() => {
    const mediaItems = this.componentStore.mediaItems();

    if (!this.isExpanded()) {
      return mediaItems.slice(0, 5);
    }
    return mediaItems;
  });

  constructor() {
    effect(() => {
      const mediaItemIds = this.mediaItemIds();
      this.componentStore.loadMediaItems({ mediaItemIds });
    });
  }

  toggle() {
    this.isExpanded.set(true);
  }
}
