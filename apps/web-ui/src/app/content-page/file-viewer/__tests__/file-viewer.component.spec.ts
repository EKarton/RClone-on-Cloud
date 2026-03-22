import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import {
  toFailure,
  toPending,
  toSuccess,
} from '../../../shared/results/results';
import { WebApiService } from '../../services/web-api/web-api.service';
import { dialogsState } from '../../store/dialogs';
import { DialogState, FEATURE_KEY } from '../../store/dialogs/dialogs.state';
import { FileViewerComponent } from '../file-viewer.component';
import { FileViewerRequest } from '../file-viewer.request';

describe('FileViewerComponent', () => {
  let mockWebApiService: jasmine.SpyObj<WebApiService>;
  let mockStore: MockStore;

  beforeEach(async () => {
    mockWebApiService = jasmine.createSpyObj('WebApiService', [
      'fetchFileContent',
    ]);

    // Default: no file content request
    mockWebApiService.fetchFileContent.and.returnValue(of(toPending<Blob>()));

    await TestBed.configureTestingModule({
      imports: [FileViewerComponent],
      providers: [
        provideMockStore({
          initialState: {
            [FEATURE_KEY]: { requests: [] } as DialogState,
          },
        }),
        { provide: WebApiService, useValue: mockWebApiService },
      ],
    }).compileComponents();

    mockStore = TestBed.inject(MockStore);
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show loading spinner when file is loading', () => {
    mockWebApiService.fetchFileContent.and.returnValue(of(toPending<Blob>()));
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [
          new FileViewerRequest('remote', 'path', 'file.txt', 'text/plain'),
        ],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.loading-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should show error when file loading fails', fakeAsync(() => {
    const request = new FileViewerRequest(
      'remote',
      'path',
      'file.txt',
      'text/plain',
    );

    mockWebApiService.fetchFileContent.and.returnValue(
      of(toFailure<Blob>(new Error('Network error'))),
    );
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [request],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector(
      '[data-testid="file-viewer-error"]',
    );
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Network error');
  }));

  it('should show image viewer for image/* mimeType', fakeAsync(() => {
    const request = new FileViewerRequest(
      'remote',
      'path',
      'photo.jpg',
      'image/jpeg',
    );

    const blob = new Blob(['image data'], { type: 'image/jpeg' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [request],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const imageViewer = fixture.nativeElement.querySelector(
      '[data-testid="image-viewer"]',
    );
    expect(imageViewer).toBeTruthy();
  }));

  it('should show video viewer for video/* mimeType', fakeAsync(() => {
    const request = new FileViewerRequest(
      'remote',
      'path',
      'movie.mp4',
      'video/mp4',
    );

    const blob = new Blob(['video data'], { type: 'video/mp4' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [request],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const videoViewer = fixture.nativeElement.querySelector(
      '[data-testid="video-viewer"]',
    );
    expect(videoViewer).toBeTruthy();
  }));

  it('should show audio viewer for audio/* mimeType', fakeAsync(() => {
    const request = new FileViewerRequest(
      'remote',
      'path',
      'song.mp3',
      'audio/mpeg',
    );

    const blob = new Blob(['audio data'], { type: 'audio/mpeg' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [request],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const audioViewer = fixture.nativeElement.querySelector(
      '[data-testid="audio-viewer"]',
    );
    expect(audioViewer).toBeTruthy();
  }));

  it('should show pdf viewer for application/pdf mimeType', fakeAsync(() => {
    const request = new FileViewerRequest(
      'remote',
      'path',
      'doc.pdf',
      'application/pdf',
    );

    const blob = new Blob(['pdf data'], { type: 'application/pdf' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [request],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const pdfViewer = fixture.nativeElement.querySelector(
      '[data-testid="pdf-viewer"]',
    );
    expect(pdfViewer).toBeTruthy();
  }));

  it('should show text viewer for text/* mimeType', fakeAsync(() => {
    const request = new FileViewerRequest(
      'remote',
      'path',
      'readme.txt',
      'text/plain',
    );

    const blob = new Blob(['Hello World'], { type: 'text/plain' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [request],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // text-viewer initially shows a spinner, then shows content
    // After tick(), blob.text() should resolve
    expect(fixture.nativeElement.querySelector('app-text-viewer')).toBeTruthy();
  }));

  it('should show text viewer for application/json mimeType', fakeAsync(() => {
    const request = new FileViewerRequest(
      'remote',
      'path',
      'data.json',
      'application/json',
    );

    const blob = new Blob(['{}'], { type: 'application/json' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [request],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-text-viewer')).toBeTruthy();
  }));

  it('should show unsupported viewer for unknown mimeType', fakeAsync(() => {
    const request = new FileViewerRequest(
      'remote',
      'path',
      'archive.zip',
      'application/zip',
    );

    const blob = new Blob(['zip data'], { type: 'application/zip' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [request],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const unsupported = fixture.nativeElement.querySelector(
      '[data-testid="unsupported-viewer"]',
    );
    expect(unsupported).toBeTruthy();
  }));

  it('should show filename and download button when loaded', fakeAsync(() => {
    const request = new FileViewerRequest(
      'remote',
      'path',
      'photo.jpg',
      'image/jpeg',
    );

    const blob = new Blob(['data'], { type: 'image/jpeg' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [request],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const filename = fixture.nativeElement.querySelector(
      '[data-testid="file-viewer-filename"]',
    );
    expect(filename).toBeTruthy();
    expect(filename.textContent).toContain('photo.jpg');

    const downloadBtn = fixture.nativeElement.querySelector(
      '[data-testid="file-viewer-download-button"]',
    );
    expect(downloadBtn).toBeTruthy();
    expect(downloadBtn.download).toBe('photo.jpg');
  }));

  it('should dispatch closeDialog when close button is clicked', fakeAsync(() => {
    const request = new FileViewerRequest(
      'remote',
      'path',
      'photo.jpg',
      'image/jpeg',
    );

    const blob = new Blob(['data'], { type: 'image/jpeg' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [request],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    spyOn(mockStore, 'dispatch');

    const closeBtn = fixture.nativeElement.querySelector(
      '[data-testid="file-viewer-close-button"]',
    );
    closeBtn.click();

    expect(mockStore.dispatch).toHaveBeenCalled();
  }));

  it('should call fetchFileContent when request changes', fakeAsync(() => {
    const request = new FileViewerRequest(
      'myremote',
      'docs',
      'file.txt',
      'text/plain',
    );

    const blob = new Blob(['content'], { type: 'text/plain' });
    mockWebApiService.fetchFileContent.and.returnValue(of(toSuccess(blob)));
    mockStore.setState({
      [dialogsState.FEATURE_KEY]: {
        requests: [request],
      },
    });
    mockStore.refreshState();

    const fixture = TestBed.createComponent(FileViewerComponent);
    fixture.detectChanges();
    tick();

    expect(mockWebApiService.fetchFileContent).toHaveBeenCalledWith(
      'myremote',
      'docs',
      'file.txt',
    );
  }));
});
