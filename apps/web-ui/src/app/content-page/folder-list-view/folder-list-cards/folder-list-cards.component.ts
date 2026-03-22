import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, Signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Buffer } from 'buffer';

import { HasFailedPipe } from '../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../shared/results/pipes/is-pending.pipe';
import { ListAlbumsSortBy } from '../../services/web-api/types/list-albums';
import { hasSucceed, Result, toPending } from '../../../shared/results/results';
import { ListFolderResponse } from '../../services/web-api/types/list-folder';
import { mapResult } from '../../../shared/results/utils/mapResult';
import { REMOTE_PATH$ } from '../folder-list-view.tokens';
import { combineLatest, switchMap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { mapResultRxJs } from '../../../shared/results/rxjs/mapResultRxJs';

interface Item {
  name: string;
  mimeType: string;
  isDir: boolean;
  onClick: () => void;
}

@Component({
  standalone: true,
  selector: 'app-folder-list-cards',
  imports: [CommonModule, RouterModule, HasFailedPipe, IsPendingPipe],
  templateUrl: './folder-list-cards.component.html',
})
export class FolderListCardsComponent {
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
                isDir: item.isDir,
                onClick: () => {
                  if (item.isDir) {
                    const newPath = path ? `${path}/${item.name}` : item.name;

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
