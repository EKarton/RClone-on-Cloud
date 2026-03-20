import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, Signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { HasFailedPipe } from '../../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../../shared/results/pipes/is-pending.pipe';
import { Result } from '../../../../shared/results/results';
import { Album } from '../../../services/web-api/types/album';
import { ListAlbumsSortBy } from '../../../services/web-api/types/list-albums';
import { AlbumsListCardsStore } from './albums-list-cards.store';

@Component({
  standalone: true,
  selector: 'app-content-albums-list-cards',
  imports: [CommonModule, RouterModule, HasFailedPipe, IsPendingPipe],
  templateUrl: './albums-list-cards.component.html',
  providers: [AlbumsListCardsStore],
})
export class AlbumsListCardsComponent {
  readonly albumId = input.required<string>();
  readonly sortBy = input.required<ListAlbumsSortBy>();

  private readonly albumsListTableStore = inject(AlbumsListCardsStore);

  readonly albumsResult: Signal<Result<Album[]>> =
    this.albumsListTableStore.albumsResult;

  constructor() {
    effect(() => {
      this.albumsListTableStore.loadAlbums({
        albumId: this.albumId(),
        sortBy: this.sortBy(),
      });
    });
  }
}
