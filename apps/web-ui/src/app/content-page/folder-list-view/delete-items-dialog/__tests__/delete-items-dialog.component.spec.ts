import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { dialogsState, dialogsActions } from '../../../store/dialogs';
import { jobsActions } from '../../../store/jobs';
import { REMOTE_PATH$, RemotePath } from '../../folder-list-view.tokens';
import { DeleteItemsDialogComponent } from '../delete-items-dialog.component';
import { DeleteItemsDialogRequest } from '../delete-items-dialog.request';

describe('DeleteItemsDialogComponent', () => {
  let fixture: ComponentFixture<DeleteItemsDialogComponent>;
  let mockStore: MockStore;
  let remotePathSubject: BehaviorSubject<RemotePath>;

  beforeEach(async () => {
    // HTMLDialogElement isn't implemented by JSDOM
    if (typeof HTMLDialogElement !== 'undefined') {
      if (!HTMLDialogElement.prototype.showModal) {
        HTMLDialogElement.prototype.showModal = vi.fn();
      }
      if (!HTMLDialogElement.prototype.close) {
        HTMLDialogElement.prototype.close = vi.fn();
      }
    }

    remotePathSubject = new BehaviorSubject<RemotePath>({
      remote: 'my-remote',
      path: 'my-path',
    });

    await TestBed.configureTestingModule({
      imports: [DeleteItemsDialogComponent],
      providers: [
        provideMockStore({
          initialState: {
            [dialogsState.FEATURE_KEY]: dialogsState.initialState,
          },
        }),
        { provide: REMOTE_PATH$, useValue: remotePathSubject },
      ],
    }).compileComponents();

    mockStore = TestBed.inject(MockStore);
    vi.spyOn(mockStore, 'dispatch');

    fixture = TestBed.createComponent(DeleteItemsDialogComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open dialog when request arrives', async () => {
    const request = new DeleteItemsDialogRequest({
      path: 'file.txt',
      name: 'file.txt',
      isDir: false,
    });

    mockStore.setState({
      [dialogsState.FEATURE_KEY]: { requests: [request] },
    });
    mockStore.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[data-testid="delete-button"]')).toBeTruthy();
  });

  it('should dispatch submitJob with delete-file when deleting a file', async () => {
    const request = new DeleteItemsDialogRequest({
      path: 'file.txt',
      name: 'file.txt',
      isDir: false,
    });
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: { requests: [request] },
    });
    mockStore.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    const deleteButton = fixture.nativeElement.querySelector('[data-testid="delete-button"]');
    deleteButton.click();

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'delete-file',
          remote: 'my-remote',
          path: 'file.txt',
        },
      }),
    );
  });

  it('should dispatch submitJob with delete-folder when deleting a directory', async () => {
    const request = new DeleteItemsDialogRequest({
      path: 'my-folder',
      name: 'my-folder',
      isDir: true,
    });
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: { requests: [request] },
    });
    mockStore.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    const deleteButton = fixture.nativeElement.querySelector('[data-testid="delete-button"]');
    deleteButton.click();

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'delete-folder',
          remote: 'my-remote',
          path: 'my-folder',
        },
      }),
    );
  });

  it('should dispatch closeDialog when cancel button is clicked', async () => {
    const request = new DeleteItemsDialogRequest({
      path: 'file.txt',
      name: 'file.txt',
      isDir: false,
    });
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: { requests: [request] },
    });
    mockStore.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    const cancelButton = fixture.nativeElement.querySelector('[data-testid="cancel-button"]');
    cancelButton.click();

    expect(mockStore.dispatch).toHaveBeenCalledWith(dialogsActions.closeDialog());
  });
});
