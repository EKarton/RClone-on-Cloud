import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { InViewportModule } from 'ng-in-viewport';

import { HasFailedPipe } from '../../../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../../../shared/results/pipes/is-pending.pipe';
import { mapResult } from '../../../../../shared/results/utils/mapResult';
import { ImageMapMarkerStore } from './image-map-marker.store';

@Component({
  standalone: true,
  selector: 'app-content-image-map-marker',
  imports: [CommonModule, InViewportModule, HasFailedPipe, IsPendingPipe],
  templateUrl: './image-map-marker.component.html',
  providers: [ImageMapMarkerStore],
})
export class ImageMapMarkerComponent {
  readonly mediaItemId = input.required<string>();
  readonly badgeCount = input<number>(1);

  readonly markerClick = output<Event>();

  private readonly imageMarkerStore = inject(ImageMapMarkerStore);

  private readonly isInViewport = signal(false);

  readonly title = computed(() =>
    this.badgeCount() > 1
      ? `Cluster of ${this.badgeCount()} media items`
      : `Media item`,
  );

  readonly imageUrl = computed(() => {
    return mapResult(
      this.imageMarkerStore.gPhotosMediaItem(),
      (gPhotosMediaItem) => gPhotosMediaItem.baseUrl,
    );
  });

  constructor() {
    effect(() => {
      if (this.isInViewport()) {
        this.imageMarkerStore.loadGPhotosMediaItem(this.mediaItemId());
      }
    });
  }

  setIsInViewport(visible: boolean) {
    this.isInViewport.set(visible);
  }
}
