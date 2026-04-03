import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { dialogsState, dialogsActions } from '../../../store/dialogs';
import { jobsActions } from '../../../store/jobs';
import { REMOTE_PATH$, RemotePath } from '../../folder-list-view.tokens';
import { RenameItemsDialogComponent } from '../rename-items-dialog.component';
import { RenameItemsDialogRequest } from '../rename-items-dialog.request';

describe('RenameItemsDialogComponent', () => {
  let fixture: ComponentFixture<RenameItemsDialogComponent>;
  let mockStore: MockStore;
  let remotePathSubject: BehaviorSubject<RemotePath>;

  beforeEach(async () => {
    // Mock HTMLDialogElement.prototype.showModal and close (not implemented in JSDOM)
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
      imports: [RenameItemsDialogComponent],
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

    fixture = TestBed.createComponent(RenameItemsDialogComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open dialog and populate newName when request arrives', async () => {
    const request = new RenameItemsDialogRequest({
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

    expect(fixture.componentInstance.newName).toBe('file.txt');
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('should dispatch submitJob with move-file when renaming a file', async () => {
    const request = new RenameItemsDialogRequest({
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

    const textBox = fixture.nativeElement.querySelector('input[type="text"]');
    textBox.value = 'renamed.txt';
    textBox.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('[data-testid="submit-button"]');
    submitButton.click();

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'move-file',
          fromRemote: 'my-remote',
          fromPath: 'file.txt',
          toRemote: 'my-remote',
          toPath: 'my-path/renamed.txt',
        },
      }),
    );
    expect(mockStore.dispatch).toHaveBeenCalledWith(dialogsActions.closeDialog());
  });

  it('should dispatch submitJob with move-folder when renaming a directory', async () => {
    const request = new RenameItemsDialogRequest({
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

    const textBox = fixture.nativeElement.querySelector('input[type="text"]');
    textBox.value = 'renamed-folder';
    textBox.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('[data-testid="submit-button"]');
    submitButton.click();

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'move-folder',
          fromRemote: 'my-remote',
          fromPath: 'my-folder',
          toRemote: 'my-remote',
          toPath: 'my-path/renamed-folder',
        },
      }),
    );
    expect(mockStore.dispatch).toHaveBeenCalledWith(dialogsActions.closeDialog());
  });

  it('should dispatch submitJob with correct top-level path when remotePath path is empty', async () => {
    remotePathSubject.next({ remote: 'my-remote', path: '' });
    const request = new RenameItemsDialogRequest({
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

    const textBox = fixture.nativeElement.querySelector('input[type="text"]');
    textBox.value = 'renamed.txt';
    textBox.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('[data-testid="submit-button"]');
    submitButton.click();

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'move-file',
          fromRemote: 'my-remote',
          fromPath: 'file.txt',
          toRemote: 'my-remote',
          toPath: 'renamed.txt',
        },
      }),
    );
    expect(mockStore.dispatch).toHaveBeenCalledWith(dialogsActions.closeDialog());
  });

  it('should not dispatch submitJob if newName is unchanged or empty', async () => {
    const request = new RenameItemsDialogRequest({
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

    // unchanged
    const textBox = fixture.nativeElement.querySelector('input[type="text"]');
    textBox.value = 'file.txt';
    textBox.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('[data-testid="submit-button"]');
    submitButton.click();
    expect(mockStore.dispatch).not.toHaveBeenCalled();

    // empty
    textBox.value = '   ';
    textBox.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    submitButton.click();
    expect(mockStore.dispatch).not.toHaveBeenCalled();
  });
});
