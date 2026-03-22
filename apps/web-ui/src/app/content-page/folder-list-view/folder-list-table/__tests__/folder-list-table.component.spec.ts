import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../auth/store';
import {
  toFailure,
  toPending,
  toSuccess,
} from '../../../../shared/results/results';
import { ListFolderResponse } from '../../../services/web-api/types/list-folder';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { REMOTE_PATH$ } from '../../folder-list-view.tokens';
import { FolderListTableComponent } from '../folder-list-table.component';

const ITEM_DETAILS = {
  path: 'folder1',
  name: 'Folder 1',
  size: 1024,
  mimeType: 'text/plain',
  modTime: new Date(),
  isDir: true,
};

describe('FolderListTableComponent', () => {
  let mockWebApiService: jasmine.SpyObj<WebApiService>;

  beforeEach(async () => {
    mockWebApiService = jasmine.createSpyObj('WebApiService', ['listFolder']);

    await TestBed.configureTestingModule({
      imports: [FolderListTableComponent],
      providers: [
        provideRouter([]),
        provideMockStore({
          selectors: [
            {
              selector: authState.selectAuthToken,
              value: 'auth123',
            },
          ],
        }),
        { provide: WebApiService, useValue: mockWebApiService },
        {
          provide: REMOTE_PATH$,
          useValue: of({ remote: 'remote1', path: 'path1' }),
        },
      ],
    }).compileComponents();
  });

  it('should render skeleton when items are not loaded yet', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toPending<ListFolderResponse>(),
    );
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="table-row-skeleton"]',
      ).length,
    ).toEqual(10);
  });

  it('should show error when items has failed to load', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toFailure<ListFolderResponse>(new Error('Random error')),
    );
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="table-row-error"]'),
    ).toBeTruthy();
  });

  it('should render correctly when items are loaded', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({
        items: [ITEM_DETAILS, { ...ITEM_DETAILS, name: 'Folder 2' }],
      }),
    );
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="table-row-album"]')
        .length,
    ).toEqual(2);
  });

  it('should toggle sort when header is clicked', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({
        items: [
          { ...ITEM_DETAILS, name: 'B', isDir: false },
          { ...ITEM_DETAILS, name: 'A', isDir: false },
          { ...ITEM_DETAILS, name: 'C', isDir: true },
        ],
      }),
    );
    fixture.detectChanges();

    // Default sort: Folders first, then name ASC
    // Order should be C, A, B
    let rows = fixture.nativeElement.querySelectorAll(
      '[data-testid="table-row-album"]',
    );
    expect(rows[0].textContent).toContain('C');
    expect(rows[1].textContent).toContain('A');
    expect(rows[2].textContent).toContain('B');

    // Click "Name" header
    const nameHeader = fixture.nativeElement.querySelector('th:first-child');
    nameHeader.click();
    fixture.detectChanges();

    // Now sorted by name ASC (folders still first)
    // Order: C, A, B
    rows = fixture.nativeElement.querySelectorAll(
      '[data-testid="table-row-album"]',
    );
    expect(rows[0].textContent).toContain('C');
    expect(rows[1].textContent).toContain('A');
    expect(rows[2].textContent).toContain('B');

    // Click "Name" header again for DESC
    nameHeader.click();
    fixture.detectChanges();

    // Order: C (folder), B, A
    rows = fixture.nativeElement.querySelectorAll(
      '[data-testid="table-row-album"]',
    );
    expect(rows[0].textContent).toContain('C');
    expect(rows[1].textContent).toContain('B');
    expect(rows[2].textContent).toContain('A');
  });
});
