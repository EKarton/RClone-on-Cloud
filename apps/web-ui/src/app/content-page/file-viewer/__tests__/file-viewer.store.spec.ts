import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';

import { toFailure, toSuccess } from '../../../shared/results/results';
import { WebApiService } from '../../services/web-api/web-api.service';
import { FileViewerStore, INITIAL_STATE } from '../file-viewer.store';

describe('FileViewerStore', () => {
  let store: FileViewerStore;
  let mockWebApiService: jasmine.SpyObj<WebApiService>;

  beforeEach(() => {
    mockWebApiService = jasmine.createSpyObj('WebApiService', [
      'fetchFileContent',
    ]);

    TestBed.configureTestingModule({
      providers: [
        FileViewerStore,
        { provide: WebApiService, useValue: mockWebApiService },
      ],
    });

    store = TestBed.inject(FileViewerStore);
  });

  it('should have pending initial state', () => {
    expect(store.fileContentResult()).toEqual(INITIAL_STATE.fileContentResult);
    expect(store.fileContentResult().isLoading).toBeTrue();
  });

  it('should load file content successfully', fakeAsync(() => {
    const blob = new Blob(['content'], { type: 'text/plain' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));

    store.loadFile({
      remote: 'myremote',
      dirPath: 'some/path',
      fileName: 'file.txt',
    });
    tick();

    expect(mockWebApiService.fetchFileContent).toHaveBeenCalledWith(
      'myremote',
      'some/path',
      'file.txt',
    );
    expect(store.fileContentResult().isLoading).toBeFalse();
    expect(store.fileContentResult().data).toEqual(blob);
  }));

  it('should handle file content load failure', fakeAsync(() => {
    const error = new Error('Network error');
    mockWebApiService.fetchFileContent.and.returnValue(
      of(toFailure<Blob>(error)),
    );

    store.loadFile({
      remote: 'myremote',
      dirPath: undefined,
      fileName: 'missing.txt',
    });
    tick();

    expect(mockWebApiService.fetchFileContent).toHaveBeenCalledWith(
      'myremote',
      undefined,
      'missing.txt',
    );
    expect(store.fileContentResult().isLoading).toBeFalse();
    expect(store.fileContentResult().error).toEqual(error);
  }));

  it('should reset to pending when loading a new file', fakeAsync(() => {
    const blob = new Blob(['content'], { type: 'text/plain' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));

    store.loadFile({
      remote: 'myremote',
      dirPath: 'path',
      fileName: 'first.txt',
    });
    tick();

    expect(store.fileContentResult().isLoading).toBeFalse();

    // Load a second file — store should reset to pending during load
    const blob2 = new Blob(['other content'], { type: 'text/plain' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob2)));

    store.loadFile({
      remote: 'myremote',
      dirPath: 'path',
      fileName: 'second.txt',
    });
    tick();

    expect(store.fileContentResult().data).toEqual(blob2);
  }));
});
