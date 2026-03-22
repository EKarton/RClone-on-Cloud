import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { RangePipe } from '../../../shared/pipes/range.pipe';
import { HasFailedPipe } from '../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../shared/results/pipes/is-pending.pipe';
import { ListAlbumsSortBy } from '../../services/web-api/types/list-albums';

@Component({
  standalone: true,
  selector: 'app-folder-list-table',
  imports: [
    CommonModule,
    RouterModule,
    HasFailedPipe,
    IsPendingPipe,
    RangePipe,
  ],
  templateUrl: './folder-list-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FolderListTableComponent {
  readonly sortBy = input.required<ListAlbumsSortBy>();
}
