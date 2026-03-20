import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  Signal,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';

import { RangePipe } from '../../../../shared/pipes/range.pipe';
import { HasFailedPipe } from '../../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../../shared/results/pipes/is-pending.pipe';
import { hasSucceed, Result } from '../../../../shared/results/results';
import { mapResult } from '../../../../shared/results/utils/mapResult';
import { Album } from '../../../services/web-api/types/album';
import { ListAlbumsSortBy } from '../../../services/web-api/types/list-albums';
import { AlbumsListTableStore } from './albums-list-table.store';

@Component({
  standalone: true,
  selector: 'app-content-albums-list-table',
  imports: [
    CommonModule,
    RouterModule,
    HasFailedPipe,
    IsPendingPipe,
    RangePipe,
  ],
  templateUrl: './albums-list-table.component.html',
  providers: [AlbumsListTableStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlbumsListTableComponent {
  readonly albumId = input.required<string>();
  readonly sortBy = input.required<ListAlbumsSortBy>();

  private readonly albumsListTableStore = inject(AlbumsListTableStore);

  readonly albumsResult: Signal<Result<Album[]>> = computed(() => {
    const currentPageResult = this.albumsListTableStore.currentPage();
    return mapResult(currentPageResult, (currentPage) => currentPage.albums);
  });

  readonly pageNumber: Signal<number> = this.albumsListTableStore.pageNumber;

  readonly hasNextPage: Signal<boolean> = computed(() => {
    const albumsResult = this.albumsListTableStore.currentPage();
    if (!hasSucceed(albumsResult)) {
      return false;
    }

    return albumsResult.data?.nextPageToken !== undefined;
  });

  readonly pageSizeOptions = [5, 10, 15];
  readonly currentPageSize = signal(5);

  constructor() {
    effect(() => {
      this.albumsListTableStore.loadInitialPage({
        albumId: this.albumId(),
        pageSize: this.currentPageSize(),
        sortBy: this.sortBy(),
      });
    });
  }

  onPageSizeChange(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    this.currentPageSize.set(value);
  }

  goToFirstPage() {
    this.albumsListTableStore.goToFirstPage();
  }

  goToPreviousPage() {
    this.albumsListTableStore.goToPreviousPage();
  }

  goToNextPage() {
    this.albumsListTableStore.goToNextPage();
  }
}
