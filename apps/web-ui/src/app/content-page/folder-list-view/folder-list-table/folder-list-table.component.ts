import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, Signal } from '@angular/core';
import { computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Buffer } from 'buffer';
import prettyBytes from 'pretty-bytes';

import { RangePipe } from '../../../shared/pipes/range.pipe';
import { HasFailedPipe } from '../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../shared/results/pipes/is-pending.pipe';
import { hasSucceed, Result, toPending, toSuccess } from '../../../shared/results/results';
import { FileViewerRequest } from '../../file-viewer/file-viewer.request';
import { ListFolderResponse } from '../../services/web-api/types/list-folder';
import { dialogsActions } from '../../store/dialogs';
import { REMOTE_PATH$ } from '../folder-list-view.tokens';

export type SortField = 'name' | 'lastModified' | 'size' | 'mimeType';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

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
  imports: [CommonModule, RouterModule, HasFailedPipe, IsPendingPipe, RangePipe],
  templateUrl: './folder-list-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FolderListTableComponent {
  readonly contentsResult = input.required<Result<ListFolderResponse>>();

  readonly sortConfig = signal<SortConfig | null>(null);

  private readonly remotePath = toSignal(inject(REMOTE_PATH$));
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  readonly itemsResult: Signal<Result<Item[]>> = computed(() => {
    const result = this.contentsResult();
    const sort = this.sortConfig();
    const remotePath = this.remotePath();

    if (!remotePath) {
      return toPending<Item[]>();
    }

    if (!hasSucceed(result)) {
      return result as unknown as Result<Item[]>;
    }

    const items = [...result.data!.items];

    if (sort) {
      items.sort((a, b) => {
        // Folders always first
        if (a.isDir && !b.isDir) {
          return -1;
        }
        if (!a.isDir && b.isDir) {
          return 1;
        }

        let valA: string | Date | number;
        let valB: string | Date | number;

        switch (sort.field) {
          case 'name':
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
            break;
          case 'size':
            valA = a.size ?? 0;
            valB = b.size ?? 0;
            break;
          case 'lastModified':
            valA = a.modTime?.getTime() ?? 0;
            valB = b.modTime?.getTime() ?? 0;
            break;
          case 'mimeType':
            valA = (a.mimeType ?? '').toLowerCase();
            valB = (b.mimeType ?? '').toLowerCase();
            break;
          default:
            valA = 0;
            valB = 0;
            break;
        }

        if (valA < valB) {
          return sort.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default: Folders first, then name ASC
      items.sort((a, b) => {
        if (a.isDir && !b.isDir) {
          return -1;
        }
        if (!a.isDir && b.isDir) {
          return 1;
        }
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    }

    const mappedItems: Item[] = items.map((item) => {
      return {
        name: item.name,
        mimeType: item.mimeType ?? '',
        size: item.size ? prettyBytes(item.size) : undefined,
        lastModified: item.modTime?.toDateString() ?? undefined,
        isDir: item.isDir,
        onClick: () => {
          if (item.isDir) {
            this.router.navigate([
              '/folders',
              Buffer.from(`${remotePath.remote}:${item.path}`).toString('base64').replace(/=/g, ''),
            ]);
          } else {
            this.store.dispatch(
              dialogsActions.openDialog({
                request: new FileViewerRequest(
                  remotePath.remote,
                  remotePath.path,
                  item.name,
                  item.mimeType ?? '',
                ),
              }),
            );
          }
        },
      };
    });

    return toSuccess(mappedItems);
  });

  toggleSort(field: SortField) {
    this.sortConfig.update((current) => {
      if (current?.field === field) {
        return {
          field,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { field, direction: 'asc' };
    });
  }
}
