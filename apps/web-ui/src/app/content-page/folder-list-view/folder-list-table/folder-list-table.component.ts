import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  Signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Buffer } from 'buffer';

import { RangePipe } from '../../../shared/pipes/range.pipe';
import { HasFailedPipe } from '../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../shared/results/pipes/is-pending.pipe';
import { ListAlbumsSortBy } from '../../services/web-api/types/list-albums';
import { Result, toPending } from '../../../shared/results/results';
import { ListFolderResponse } from '../../services/web-api/types/list-folder';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { REMOTE_PATH$ } from '../folder-list-view.tokens';
import { switchMap } from 'rxjs';
import { mapResultRxJs } from '../../../shared/results/rxjs/mapResultRxJs';
import prettyBytes from 'pretty-bytes';

interface Item {
  name: string;
  mimeType: string;
  size: string | undefined;
  lastModified: string | undefined;
  isDir: boolean;
  onClick: () => void;
}

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
  readonly contentsResult = input.required<Result<ListFolderResponse>>();

  private readonly contentsResult$ = toObservable(this.contentsResult);
  private readonly remotePath$ = inject(REMOTE_PATH$);
  private readonly router = inject(Router);

  readonly itemsResult: Signal<Result<Item[]>> = toSignal(
    this.remotePath$.pipe(
      switchMap(({ remote, path }) => {
        return this.contentsResult$.pipe(
          mapResultRxJs((contents) => {
            return contents.items.map((item) => {
              return {
                name: item.name,
                mimeType: item.mimeType ?? '',
                size: item.size ? prettyBytes(item.size) : undefined,
                lastModified: item.modTime?.toDateString() ?? undefined,
                isDir: item.isDir,
                onClick: () => {
                  if (item.isDir) {
                    const newPath = path ? `${path}/${item.path}` : item.path;

                    this.router.navigate([
                      '/folders',
                      Buffer.from(`${remote}:${newPath}`)
                        .toString('base64')
                        .replace(/=/g, ''),
                    ]);
                  }
                },
              };
            });
          }),
        );
      }),
    ),
    { initialValue: toPending<Item[]>() },
  );
}
