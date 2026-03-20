import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  Signal,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';

import { HasFailedPipe } from '../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../shared/results/pipes/is-pending.pipe';
import { Result } from '../../../shared/results/results';
import { takeSuccessfulDataOrElse } from '../../../shared/results/utils/takeSuccessfulDataOrElse';
import * as themeState from '../../../themes/store/theme.state';
import { Heatmap } from '../../services/web-api/types/heatmap';
import { ImagesMapStore } from './images-map.store';
import {
  ImagesMapViewerComponent,
  TileId,
} from './images-map-viewer/images-map-viewer.component';

@Component({
  standalone: true,
  selector: 'app-content-images-map',
  imports: [
    CommonModule,
    FormsModule,
    HasFailedPipe,
    IsPendingPipe,
    ImagesMapViewerComponent,
  ],
  templateUrl: './images-map.component.html',
  providers: [ImagesMapStore],
})
export class ImagesMapComponent implements AfterViewInit, OnDestroy {
  readonly albumId = input<string>();

  private readonly store = inject(Store);
  private readonly imagesMapViewStore = inject(ImagesMapStore);

  @ViewChild('fullscreenContainer', { static: true })
  fullscreenContainer!: ElementRef;

  readonly areTilesVisible = signal(false);
  readonly isHeatmapVisible = signal(true);
  readonly areSampledImagesVisible = signal(true);

  readonly numTiles: Signal<number> = this.imagesMapViewStore.numTiles;

  readonly heatmapResult: Signal<Result<Heatmap>> =
    this.imagesMapViewStore.heatmapResult;

  readonly heatmap: Signal<Heatmap> = computed(() => {
    return takeSuccessfulDataOrElse(this.heatmapResult(), { points: [] });
  });

  readonly isDarkMode = this.store.selectSignal(themeState.selectIsDarkMode);
  readonly isFullscreen = signal(false);

  constructor() {
    effect(() => {
      this.fetchTiles([], this.albumId());
    });
  }

  ngAfterViewInit() {
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  ngOnDestroy() {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
  }

  // Use an arrow function to preserve "this"
  onFullscreenChange = () => {
    const isNowFullscreen = !!document.fullscreenElement;
    this.isFullscreen.set(isNowFullscreen);
  };

  toggleFullscreen() {
    if (!this.isFullscreen()) {
      this.goFullscreen();
    } else {
      this.exitFullscreen();
    }
  }

  private goFullscreen() {
    const element = this.fullscreenContainer.nativeElement;
    if (element.requestFullscreen) {
      element
        .requestFullscreen()
        .then(() => this.isFullscreen.set(true))
        .catch((err: Error) => {
          console.error('Failed to enter fullscreen:', err);
        });
    }
  }

  private exitFullscreen() {
    document.exitFullscreen();
    this.isFullscreen.set(false);
  }

  fetchTiles(tileIds: TileId[], albumId?: string) {
    this.imagesMapViewStore.loadTiles({
      tileIds: tileIds,
      albumId,
    });
  }
}
