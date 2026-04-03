import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AddItemsDropdownComponent } from '../add-items-dropdown.component';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { REMOTE_PATH$ } from '../../folder-list-view.tokens';
import { jobsActions } from '../../../store/jobs';
import { toSuccess } from '../../../../shared/results/results';

describe('AddItemsDropdownComponent', () => {
  let component: AddItemsDropdownComponent;
  let fixture: ComponentFixture<AddItemsDropdownComponent>;
  let store: MockStore;
  let webApiService: { mkdir: ReturnType<typeof vi.fn> };

  const remotePathValue = {
    remote: 'my-remote',
    path: '/base/path',
  };

  beforeEach(() => {
    webApiService = {
      mkdir: vi.fn().mockReturnValue(of(toSuccess(undefined))),
    };

    TestBed.configureTestingModule({
      imports: [AddItemsDropdownComponent],
      providers: [
        provideMockStore(),
        {
          provide: REMOTE_PATH$,
          useValue: of(remotePathValue),
        },
        {
          provide: WebApiService,
          useValue: webApiService,
        },
      ],
    });

    fixture = TestBed.createComponent(AddItemsDropdownComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);

    vi.spyOn(store, 'dispatch');

    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;

    dialog.showModal = () => {
      /* mock */
    };
    dialog.close = () => {
      /* mock */
    };
  });

  function setFiles(input: HTMLInputElement, files: File[]) {
    Object.defineProperty(input, 'files', {
      value: files,
      configurable: true,
    });
  }

  function createFile(
    name: string,
    content = 'content',
    type = 'text/plain',
    webkitRelativePath?: string,
  ): File {
    const file = new File([content], name, { type });

    if (webkitRelativePath !== undefined) {
      Object.defineProperty(file, 'webkitRelativePath', {
        value: webkitRelativePath,
        configurable: true,
      });
    }

    return file;
  }

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch upload-file action when a file is selected', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );
    const file = createFile('hello.txt');

    setFiles(input, [file]);
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'upload-file',
          remote: 'my-remote',
          dirPath: '/base/path',
          file,
        },
      }),
    );
  });

  it('should not dispatch upload-file action when no file is selected', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[type="file"]:not([webkitdirectory])',
    );

    setFiles(input, []);
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('should dispatch one upload-file action per selected folder file', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[webkitdirectory]');
    const file1 = createFile('a.txt', 'a', 'text/plain', 'folder/a.txt');
    const file2 = createFile('b.txt', 'b', 'text/plain', 'folder/sub/b.txt');

    setFiles(input, [file1, file2]);
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledTimes(2);

    expect(store.dispatch).toHaveBeenNthCalledWith(
      1,
      jobsActions.submitJob({
        request: {
          kind: 'upload-file',
          remote: 'my-remote',
          dirPath: '/base/path/folder',
          file: file1,
        },
      }),
    );

    expect(store.dispatch).toHaveBeenNthCalledWith(
      2,
      jobsActions.submitJob({
        request: {
          kind: 'upload-file',
          remote: 'my-remote',
          dirPath: '/base/path/folder/sub',
          file: file2,
        },
      }),
    );
  });

  it('should dispatch upload-file action to base path for root-level folder file', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[webkitdirectory]');
    const file = createFile('root.txt', 'x', 'text/plain', 'root.txt');

    setFiles(input, [file]);
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'upload-file',
          remote: 'my-remote',
          dirPath: '/base/path',
          file,
        },
      }),
    );
  });

  it('should not dispatch folder upload action when no files are selected', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[webkitdirectory]');

    setFiles(input, []);
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('should call mkdir when the create folder form is submitted', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'dialog input[name="folderName"]',
    );
    const form: HTMLFormElement = fixture.nativeElement.querySelector('dialog form');

    input.value = 'new-folder';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'mkdir',
          remote: 'my-remote',
          dirPath: '/base/path/new-folder',
        },
      }),
    );
  });

  it('should trim the folder name before calling mkdir', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'dialog input[name="folderName"]',
    );
    const form: HTMLFormElement = fixture.nativeElement.querySelector('dialog form');

    input.value = '  new-folder  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(
      jobsActions.submitJob({
        request: {
          kind: 'mkdir',
          remote: 'my-remote',
          dirPath: '/base/path/new-folder',
        },
      }),
    );
  });

  it('should not call mkdir when the folder name is blank', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'dialog input[name="folderName"]',
    );
    const form: HTMLFormElement = fixture.nativeElement.querySelector('dialog form');

    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
