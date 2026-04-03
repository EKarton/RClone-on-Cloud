import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { Buffer } from 'buffer';
import { of } from 'rxjs';
import { Mocked, vi } from 'vitest';

import { authState } from '../../../../auth/store';
import { toFailure, toPending, toSuccess } from '../../../../shared/results/results';
import { ListFolderResponse } from '../../../services/web-api/types/list-folder';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { REMOTE_PATH$ } from '../../folder-list-view.tokens';
import { FolderListTableComponent } from '../folder-list-table.component';
import { Store } from '@ngrx/store';
import { MoveItemsDialogRequest } from '../../move-items-dialog/move-items-dialog.request';
import { RenameItemsDialogRequest } from '../../rename-items-dialog/rename-items-dialog.request';
import { DeleteItemsDialogRequest } from '../../delete-items-dialog/delete-items-dialog.request';
import { dialogsActions } from '../../../store/dialogs';
import { CopyItemsDialogRequest } from '../../copy-items-dialog/copy-items-dialog.request';

const ITEM_DETAILS = {
  path: 'folder1',
  name: 'Folder 1',
  size: 1024,
  mimeType: 'text/plain',
  modTime: new Date(),
  isDir: true,
};

describe('FolderListTableComponent', () => {
  let mockWebApiService: Mocked<WebApiService>;

  beforeEach(async () => {
    mockWebApiService = {
      listFolder: vi.fn(),
    } as unknown as Mocked<WebApiService>;

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
    fixture.componentRef.setInput('contentsResult', toPending<ListFolderResponse>());
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="table-row-skeleton"]').length,
    ).toBe(10);
  });

  it('should show error when items has failed to load', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toFailure<ListFolderResponse>(new Error('Random error')),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="table-row-error"]')).toBeTruthy();
  });

  it('should render no content message when content results are empty', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput('contentsResult', toSuccess<ListFolderResponse>({ items: [] }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-no-content-message')).toBeTruthy();
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

    expect(fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]').length).toBe(2);
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
    let rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('C');
    expect(rows[1].textContent).toContain('A');
    expect(rows[2].textContent).toContain('B');

    // Click "Name" header
    const nameHeader = fixture.nativeElement.querySelector('th:first-child');
    nameHeader.click();
    fixture.detectChanges();

    // Now sorted by name ASC (folders still first)
    // Order: C, A, B
    rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('C');
    expect(rows[1].textContent).toContain('A');
    expect(rows[2].textContent).toContain('B');

    // Click "Name" header again for DESC
    nameHeader.click();
    fixture.detectChanges();

    // Order: C (folder), B, A
    rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('C');
    expect(rows[1].textContent).toContain('B');
    expect(rows[2].textContent).toContain('A');
  });

  it('should sort by size correctly', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({
        items: [
          { ...ITEM_DETAILS, name: 'Small', size: 100, isDir: false },
          { ...ITEM_DETAILS, name: 'Large', size: 2000, isDir: false },
          { ...ITEM_DETAILS, name: 'Dir', isDir: true },
        ],
      }),
    );
    fixture.detectChanges();

    const sizeHeader = fixture.nativeElement.querySelectorAll('th')[2];
    sizeHeader.click(); // ASC
    fixture.detectChanges();

    let rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('Dir');
    expect(rows[1].textContent).toContain('Small');
    expect(rows[2].textContent).toContain('Large');

    sizeHeader.click(); // DESC
    fixture.detectChanges();

    rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('Dir');
    expect(rows[1].textContent).toContain('Large');
    expect(rows[2].textContent).toContain('Small');
  });

  it('should sort by lastModified correctly', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    const date1 = new Date('2023-01-01');
    const date2 = new Date('2023-02-01');

    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({
        items: [
          { ...ITEM_DETAILS, name: 'Old', modTime: date1, isDir: false },
          { ...ITEM_DETAILS, name: 'New', modTime: date2, isDir: false },
          { ...ITEM_DETAILS, name: 'Dir', isDir: true },
        ],
      }),
    );
    fixture.detectChanges();

    const dateHeader = fixture.nativeElement.querySelectorAll('th')[1];
    dateHeader.click(); // ASC
    fixture.detectChanges();

    let rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('Dir');
    expect(rows[1].textContent).toContain('Old');
    expect(rows[2].textContent).toContain('New');

    dateHeader.click(); // DESC
    fixture.detectChanges();

    rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('Dir');
    expect(rows[1].textContent).toContain('New');
    expect(rows[2].textContent).toContain('Old');
  });

  it('should sort by mimeType correctly', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({
        items: [
          {
            ...ITEM_DETAILS,
            name: 'Text',
            mimeType: 'text/plain',
            isDir: false,
          },
          {
            ...ITEM_DETAILS,
            name: 'Image',
            mimeType: 'image/png',
            isDir: false,
          },
          { ...ITEM_DETAILS, name: 'Dir', isDir: true },
        ],
      }),
    );
    fixture.detectChanges();

    const typeHeader = fixture.nativeElement.querySelectorAll('th')[3];
    typeHeader.click(); // ASC
    fixture.detectChanges();

    let rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('Dir');
    expect(rows[1].textContent).toContain('Image');
    expect(rows[2].textContent).toContain('Text');

    typeHeader.click(); // DESC
    fixture.detectChanges();

    rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('Dir');
    expect(rows[1].textContent).toContain('Text');
    expect(rows[2].textContent).toContain('Image');
  });

  it('should handle undefined values in sorting', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({
        items: [
          {
            ...ITEM_DETAILS,
            name: 'B',
            size: undefined,
            modTime: undefined,
            mimeType: undefined,
            isDir: false,
          },
          {
            ...ITEM_DETAILS,
            name: 'A',
            size: 100,
            modTime: new Date(),
            mimeType: 'a',
            isDir: false,
          },
        ],
      }),
    );
    fixture.detectChanges();

    const sizeHeader = fixture.nativeElement.querySelectorAll('th')[2];
    sizeHeader.click(); // size ASC
    fixture.detectChanges();
    let rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('B'); // 0 vs 100

    const dateHeader = fixture.nativeElement.querySelectorAll('th')[1];
    dateHeader.click(); // lastModified ASC
    fixture.detectChanges();
    rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('B'); // 0 vs Date

    const typeHeader = fixture.nativeElement.querySelectorAll('th')[3];
    typeHeader.click(); // mimeType ASC
    fixture.detectChanges();
    rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('B'); // '' vs 'a'
  });

  it('should navigate when clicking a directory', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({
        items: [{ ...ITEM_DETAILS, path: 'subdir', isDir: true }],
      }),
    );
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('[data-testid="item-name"]');
    row.click();

    expect(router.navigate).toHaveBeenCalledWith([
      '/folders',
      Buffer.from('remote1:subdir').toString('base64').replace(/=/g, ''),
    ]);
  });

  it('should NOT navigate when clicking a file', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({
        items: [{ ...ITEM_DETAILS, isDir: false }],
      }),
    );
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('[data-testid="table-row-item"]');
    row.click();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should return pending result if remotePath is not provided', () => {
    // Override the provider for this test
    TestBed.overrideProvider(REMOTE_PATH$, { useValue: of(null) });
    const fixture = TestBed.createComponent(FolderListTableComponent);
    const result = toSuccess<ListFolderResponse>({ items: [ITEM_DETAILS] });
    fixture.componentRef.setInput('contentsResult', result);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="table-row-skeleton"]')).toBeTruthy();
  });

  it('should format data correctly', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    const modTime = new Date('2023-01-01');
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({
        items: [{ ...ITEM_DETAILS, size: 1000, modTime, isDir: false }],
      }),
    );
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows[0].textContent).toContain('1 kB');
    expect(rows[0].textContent).toContain(modTime.toDateString());
  });

  it('should handle equal values in sorting', () => {
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({
        items: [
          { ...ITEM_DETAILS, name: 'A', isDir: false },
          { ...ITEM_DETAILS, name: 'A', isDir: false },
        ],
      }),
    );
    fixture.detectChanges();

    const nameHeader = fixture.nativeElement.querySelector('th:first-child');
    nameHeader.click(); // ASC
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="table-row-item"]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('A');
    expect(rows[1].textContent).toContain('A');
  });

  it('should open move dialog when move button is clicked', () => {
    const store = TestBed.inject(Store);
    vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({ items: [ITEM_DETAILS] }),
    );
    fixture.detectChanges();

    const moveButton = fixture.nativeElement.querySelector('[data-testid="move-button"]');
    moveButton.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      dialogsActions.openDialog({
        request: new MoveItemsDialogRequest(expect.objectContaining(ITEM_DETAILS)),
      }),
    );
  });

  it('should open copy dialog when copy button is clicked', () => {
    const store = TestBed.inject(Store);
    vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({ items: [ITEM_DETAILS] }),
    );
    fixture.detectChanges();

    const copyButton = fixture.nativeElement.querySelector('[data-testid="copy-button"]');
    copyButton.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      dialogsActions.openDialog({
        request: new CopyItemsDialogRequest(expect.objectContaining(ITEM_DETAILS)),
      }),
    );
  });

  it('should open rename dialog when rename button is clicked', () => {
    const store = TestBed.inject(Store);
    vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({ items: [ITEM_DETAILS] }),
    );
    fixture.detectChanges();

    const renameButton = fixture.nativeElement.querySelector('[data-testid="rename-button"]');
    renameButton.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      dialogsActions.openDialog({
        request: new RenameItemsDialogRequest(expect.objectContaining(ITEM_DETAILS)),
      }),
    );
  });

  it('should open delete dialog when delete button is clicked', () => {
    const store = TestBed.inject(Store);
    vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(FolderListTableComponent);
    fixture.componentRef.setInput(
      'contentsResult',
      toSuccess<ListFolderResponse>({ items: [ITEM_DETAILS] }),
    );
    fixture.detectChanges();

    const deleteButton = fixture.nativeElement.querySelector('[data-testid="delete-button"]');
    deleteButton.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      dialogsActions.openDialog({
        request: new DeleteItemsDialogRequest(expect.objectContaining(ITEM_DETAILS)),
      }),
    );
  });
});
