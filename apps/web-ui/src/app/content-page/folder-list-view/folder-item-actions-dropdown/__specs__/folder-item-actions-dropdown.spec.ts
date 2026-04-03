import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { vi } from 'vitest';

import { dialogsActions } from '../../../store/dialogs';
import { FolderItemActionsDropdownComponent } from '../folder-item-actions-dropdown.component';
import { MoveItemsDialogRequest } from '../../move-items-dialog/move-items-dialog.request';
import { RenameItemsDialogRequest } from '../../rename-items-dialog/rename-items-dialog.request';
import { DeleteItemsDialogRequest } from '../../delete-items-dialog/delete-items-dialog.request';
import { provideMockStore } from '@ngrx/store/testing';
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
  let store: Store;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolderItemActionsDropdownComponent],
      providers: [provideMockStore()],
    }).compileComponents();

    store = TestBed.inject(Store);
    vi.spyOn(store, 'dispatch');
  });

  it('should dispatch action to open move dialog when user clicks on move button', () => {
    const fixture = TestBed.createComponent(FolderItemActionsDropdownComponent);
    fixture.componentRef.setInput('item', ITEM_DETAILS);
    fixture.detectChanges();

    const dropdownButton = fixture.nativeElement.querySelector('.dropdown');
    dropdownButton.click();
    const moveButton = fixture.nativeElement.querySelector('[data-testid="move-button"]');
    moveButton.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      dialogsActions.openDialog({
        request: new MoveItemsDialogRequest(ITEM_DETAILS),
      }),
    );
  });

  it('should dispatch action to open copy dialog when user clicks on copy button', () => {
    const fixture = TestBed.createComponent(FolderItemActionsDropdownComponent);
    fixture.componentRef.setInput('item', ITEM_DETAILS);
    fixture.detectChanges();

    const dropdownButton = fixture.nativeElement.querySelector('.dropdown');
    dropdownButton.click();
    const copyButton = fixture.nativeElement.querySelector('[data-testid="copy-button"]');
    copyButton.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      dialogsActions.openDialog({
        request: new CopyItemsDialogRequest(ITEM_DETAILS),
      }),
    );
  });

  it('should dispatch action to open rename dialog when user clicks on rename button', () => {
    const fixture = TestBed.createComponent(FolderItemActionsDropdownComponent);
    fixture.componentRef.setInput('item', ITEM_DETAILS);
    fixture.detectChanges();

    const dropdownButton = fixture.nativeElement.querySelector('.dropdown');
    dropdownButton.click();
    const renameButton = fixture.nativeElement.querySelector('[data-testid="rename-button"]');
    renameButton.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      dialogsActions.openDialog({
        request: new RenameItemsDialogRequest(ITEM_DETAILS),
      }),
    );
  });

  it('should dispatch action to open delete dialog when user clicks on delete button', () => {
    const fixture = TestBed.createComponent(FolderItemActionsDropdownComponent);
    fixture.componentRef.setInput('item', ITEM_DETAILS);
    fixture.detectChanges();

    const dropdownButton = fixture.nativeElement.querySelector('.dropdown');
    dropdownButton.click();
    const deleteButton = fixture.nativeElement.querySelector('[data-testid="delete-button"]');
    deleteButton.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      dialogsActions.openDialog({
        request: new DeleteItemsDialogRequest(ITEM_DETAILS),
      }),
    );
  });
});
