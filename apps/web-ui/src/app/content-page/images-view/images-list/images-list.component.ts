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
  signal,
  ViewChild,
} from '@angular/core';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { NgxMasonryComponent, NgxMasonryModule } from 'ngx-masonry';

import { RESIZE_OBSERVER_FACTORY_TOKEN } from '../../../app.tokens';
import { ListMediaItemsSortBy } from '../../services/web-api/types/list-media-items';
import { ImageComponent } from './image/image.component';
import { ImagesListStore } from './images-list.store';

const DEFAULT_PAGE_SIZE = 50;

export interface Image {
  id: string;
  gPhotosMediaItemId: string;
  fileName: string;
  width: number;
  height: number;
}

@Component({
  standalone: true,
  selector: 'app-content-images-list',
  imports: [
    CommonModule,
    NgxMasonryModule,
    InfiniteScrollDirective,
    ImageComponent,
  ],
  templateUrl: './images-list.component.html',
  styleUrl: './images-list.component.scss',
  providers: [ImagesListStore],
})
export class ImagesListComponent implements AfterViewInit, OnDestroy {
  readonly albumId = input<string>();
  readonly sortBy = input.required<ListMediaItemsSortBy>();

  private readonly resizeObserverFactory = inject(
    RESIZE_OBSERVER_FACTORY_TOKEN,
  );
  private readonly componentStore = inject(ImagesListStore);

  @ViewChild(NgxMasonryComponent) ngxMasonryComponent?: NgxMasonryComponent;
  @ViewChild('masonryContainer') masonryContainer?: ElementRef;

  private observer?: ResizeObserver;
  private readonly gutterSizePx = 10;
  private readonly numColumns = signal(3);
  private readonly columnWidth = signal(200);

  readonly masonryOptions = computed(() => {
    return {
      itemSelector: '.masonry-item',
      percentPosition: true,
      gutter: this.gutterSizePx,
    };
  });

  constructor() {
    effect(() => {
      this.componentStore.loadInitialPage({
        albumId: this.albumId(),
        sortBy: this.sortBy(),
        pageSize: DEFAULT_PAGE_SIZE,
      });
    });

    effect(() => {
      this.images();
      this.ngxMasonryComponent?.reloadItems();
      this.ngxMasonryComponent?.layout();
    });
  }

  readonly images = computed(() => {
    return this.componentStore.mediaItems().map((mediaItem) => ({
      id: mediaItem.id,
      gPhotosMediaItemId: mediaItem.gPhotosMediaItemId,
      fileName: mediaItem.fileName,
      width: this.columnWidth(),
      height: (mediaItem.height / mediaItem.width) * this.columnWidth(),
    }));
  });

  ngAfterViewInit() {
    this.observer = this.resizeObserverFactory.build((entries) => {
      entries.forEach((entry) => {
        const componentWidth = entry.contentRect.width;
        const numColumns = determineNumColumns(componentWidth);

        const availableSpace =
          componentWidth - (numColumns - 1) * this.gutterSizePx;
        const newColumnWidth = Math.floor(availableSpace / numColumns);

        this.columnWidth.set(newColumnWidth);
        this.numColumns.set(numColumns);

        this.ngxMasonryComponent?.reloadItems();
        this.ngxMasonryComponent?.layout();
      });
    });

    // Start observing the target element
    if (this.masonryContainer) {
      this.observer.observe(this.masonryContainer.nativeElement);
    }
  }

  loadMoreMediaItems() {
    this.componentStore.loadMoreMediaItems();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}

function determineNumColumns(componentWidth: number): number {
  if (componentWidth < 400) {
    return 2;
  }

  if (componentWidth < 1000) {
    return 3;
  }

  if (componentWidth < 1400) {
    return 4;
  }

  return 5;
}
