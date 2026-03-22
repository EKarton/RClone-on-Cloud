import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { HasFailedPipe } from '../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../shared/results/pipes/is-pending.pipe';
import { ListAlbumsSortBy } from '../../services/web-api/types/list-albums';

@Component({
  standalone: true,
  selector: 'app-folder-list-cards',
  imports: [CommonModule, RouterModule, HasFailedPipe, IsPendingPipe],
  templateUrl: './folder-list-cards.component.html',
})
export class FolderListCardsComponent {
  readonly sortBy = input.required<ListAlbumsSortBy>();
}
