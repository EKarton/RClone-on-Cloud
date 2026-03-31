import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { dialogsState, dialogsActions } from '../../../../store/dialogs';
import { jobsActions } from '../../../../store/jobs';
import { REMOTE_PATH$, RemotePath } from '../../../folder-list-view.tokens';
import { DeleteDialogComponent } from '../delete-dialog.component';
import { DeleteDialogRequest } from '../delete-dialog.request';

describe('DeleteDialogComponent', () => {
  let fixture: ComponentFixture<DeleteDialogComponent>;
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
      imports: [DeleteDialogComponent],
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create the component', () => {
    fixture = TestBed.createComponent(DeleteDialogComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open dialog when request arrives', async () => {
    fixture = TestBed.createComponent(DeleteDialogComponent);
    fixture.detectChanges();

    const request = new DeleteDialogRequest({
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
    fixture = TestBed.createComponent(DeleteDialogComponent);
    fixture.detectChanges();

    const request = new DeleteDialogRequest({
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
    fixture = TestBed.createComponent(DeleteDialogComponent);
    fixture.detectChanges();

    const request = new DeleteDialogRequest({
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
    fixture = TestBed.createComponent(DeleteDialogComponent);
    fixture.detectChanges();

    const request = new DeleteDialogRequest({
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
