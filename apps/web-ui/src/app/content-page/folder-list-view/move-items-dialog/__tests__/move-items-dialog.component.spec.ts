import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { dialogsState, dialogsActions } from '../../../store/dialogs';
import { jobsActions } from '../../../store/jobs';
import { REMOTE_PATH$, RemotePath } from '../../folder-list-view.tokens';
import { MoveItemsDialogComponent } from '../move-items-dialog.component';
import { MoveItemsDialogRequest } from '../move-items-dialog.request';

describe('MoveItemsDialogComponent', () => {
  let fixture: ComponentFixture<MoveItemsDialogComponent>;
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
      imports: [MoveItemsDialogComponent],
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
    fixture = TestBed.createComponent(MoveItemsDialogComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open dialog and populate destinationPath when request arrives', async () => {
    fixture = TestBed.createComponent(MoveItemsDialogComponent);
    fixture.detectChanges();

    const request = new MoveItemsDialogRequest({
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
    fixture.detectChanges();

    expect(fixture.componentInstance.destinationPath).toBe('my-path');
  });

  it('should open dialog and populate empty destinationPath when remotePath has no path', async () => {
    fixture = TestBed.createComponent(MoveItemsDialogComponent);
    fixture.detectChanges();

    remotePathSubject.next({ remote: 'my-remote', path: '' });
    const request = new MoveItemsDialogRequest({
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
    fixture.detectChanges();

    expect(fixture.componentInstance.destinationPath).toBe('');
  });

  it('should close dialog when request is clear', async () => {
    fixture = TestBed.createComponent(MoveItemsDialogComponent);

    // Setup initial open state
    const request = new MoveItemsDialogRequest({
      path: 'file.txt',
      name: 'file.txt',
      isDir: false,
    });
    mockStore.setState({ [dialogsState.FEATURE_KEY]: { requests: [request] } });
    mockStore.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Now clear it
    mockStore.setState({ [dialogsState.FEATURE_KEY]: { requests: [] } });
    mockStore.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.destinationPath).toBe('');
  });

  it('should dispatch submitJob with move-file when moving a file', async () => {
    fixture = TestBed.createComponent(MoveItemsDialogComponent);
    fixture.detectChanges();

    const request = new MoveItemsDialogRequest({
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
    fixture.detectChanges();

    const textbox = fixture.nativeElement.querySelector('input[type="text"]');
    textbox.value = 'new-folder';
    textbox.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('[data-testid="move-button"]');
    submitButton.click();

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'move-file',
          fromRemote: 'my-remote',
          fromPath: 'file.txt',
          toRemote: 'my-remote',
          toPath: 'new-folder/file.txt',
        },
      }),
    );
    expect(mockStore.dispatch).toHaveBeenCalledWith(dialogsActions.closeDialog());
  });

  it('should dispatch submitJob with move-folder when moving a directory', async () => {
    fixture = TestBed.createComponent(MoveItemsDialogComponent);
    fixture.detectChanges();

    const request = new MoveItemsDialogRequest({
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
    fixture.detectChanges();

    const destinationTextbox = fixture.nativeElement.querySelector('input[type="text"]');
    destinationTextbox.value = 'new-location';
    destinationTextbox.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('[data-testid="move-button"]');
    submitButton.click();

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'move-folder',
          fromRemote: 'my-remote',
          fromPath: 'my-folder',
          toRemote: 'my-remote',
          toPath: 'new-location/my-folder',
        },
      }),
    );
    expect(mockStore.dispatch).toHaveBeenCalledWith(dialogsActions.closeDialog());
  });

  it('should handle root path destination correctly for files', async () => {
    fixture = TestBed.createComponent(MoveItemsDialogComponent);
    fixture.detectChanges();

    const request = new MoveItemsDialogRequest({
      path: 'subdir/file.txt',
      name: 'file.txt',
      isDir: false,
    });
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: { requests: [request] },
    });
    mockStore.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const destinationTextbox = fixture.nativeElement.querySelector('input[type="text"]');
    destinationTextbox.value = '/';
    destinationTextbox.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('[data-testid="move-button"]');
    submitButton.click();

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'move-file',
          fromRemote: 'my-remote',
          fromPath: 'subdir/file.txt',
          toRemote: 'my-remote',
          toPath: '/file.txt',
        },
      }),
    );
    expect(mockStore.dispatch).toHaveBeenCalledWith(dialogsActions.closeDialog());
  });

  it('should compute preview path correctly', async () => {
    fixture = TestBed.createComponent(MoveItemsDialogComponent);
    fixture.detectChanges();

    const request = new MoveItemsDialogRequest({
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
    fixture.detectChanges();

    const destinationTextbox = fixture.nativeElement.querySelector('input[type="text"]');
    destinationTextbox.value = 'new-location';
    destinationTextbox.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.getPreviewPath()).toBe('new-location/file.txt');

    destinationTextbox.value = '/';
    destinationTextbox.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.getPreviewPath()).toBe('/file.txt');

    destinationTextbox.value = '';
    destinationTextbox.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.getPreviewPath()).toBe('/file.txt');
  });
});
