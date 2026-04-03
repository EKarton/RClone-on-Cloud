import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { environment } from '../../../../../environments/environment';
import { authState } from '../../../../auth/store';
import { Result, toPending, toSuccess } from '../../../../shared/results/results';
import { ListFolderResponse, RawListFolderResponse } from '../types/list-folder';
import { ListRemoteUsageResponse } from '../types/list-remote-usage';
import { ListRemotesResponse } from '../types/list-remotes';
import { AsyncJobResponse } from '../types/async-job';
import { WebApiService } from '../web-api.service';

describe('WebApiService', () => {
  let service: WebApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({
          selectors: [
            {
              selector: authState.selectAuthToken,
              value: 'mockAccessToken',
            },
          ],
        }),
        WebApiService,
      ],
    });
    service = TestBed.inject(WebApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('listRemotes', () => {
    it('should make a POST request to list remotes', () => {
      const mockResponse = { remotes: ['remote1', 'remote2'] };

      const emissions: Result<ListRemotesResponse>[] = [];
      service.listRemotes().subscribe((response) => {
        emissions.push(response);
      });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/rclone/config/listremotes`,
      );

      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toEqual('Bearer mockAccessToken');
      req.flush(mockResponse);

      expect(emissions).toEqual([toPending(), toSuccess(mockResponse)]);
    });
  });

  describe('listFolder', () => {
    it('should map items from the raw response correctly', () => {
      const mockRawResponse: RawListFolderResponse = {
        list: [
          {
            Path: 'folder1',
            Name: 'folder1',
            Size: 0,
            MimeType: 'inode/directory',
            ModTime: '2023-01-01T00:00:00Z',
            IsDir: true,
          },
          {
            Path: 'file1.txt',
            Name: 'file1.txt',
            Size: 1024,
            MimeType: 'text/plain',
            IsDir: false,
          },
        ],
      };

      const expectedResponse: ListFolderResponse = {
        items: [
          {
            path: 'folder1',
            name: 'folder1',
            size: 0,
            mimeType: 'inode/directory',
            modTime: new Date('2023-01-01T00:00:00Z'),
            isDir: true,
          },
          {
            path: 'file1.txt',
            name: 'file1.txt',
            size: 1024,
            mimeType: 'text/plain',
            modTime: undefined,
            isDir: false,
          },
        ],
      };

      const emissions: Result<ListFolderResponse>[] = [];
      service.listFolder('my-remote', 'my-path').subscribe((response) => {
        emissions.push(response);
      });

      const req = httpMock.expectOne(`${environment.webApiEndpoint}/api/v1/rclone/operations/list`);

      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toEqual('Bearer mockAccessToken');
      expect(req.request.body).toEqual({
        fs: 'my-remote:',
        remote: 'my-path',
        _config: { UseListR: true },
      });

      req.flush(mockRawResponse);

      expect(emissions).toEqual([toPending(), toSuccess(expectedResponse)]);
    });
  });

  describe('listRemoteUsage', () => {
    it('should calculate remote usage correctly', () => {
      const mockResponse: ListRemoteUsageResponse = {
        total: 1000,
        used: 500,
        free: 400,
        trashed: 100,
      };

      const emissions: Result<ListRemoteUsageResponse>[] = [];
      service.listRemoteUsage('my-remote').subscribe((response) => {
        emissions.push(response);
      });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/rclone/operations/about`,
      );

      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toEqual('Bearer mockAccessToken');
      expect(req.request.body).toEqual({ fs: 'my-remote:' });

      req.flush(mockResponse);

      expect(emissions).toEqual([toPending(), toSuccess(mockResponse)]);
    });
  });

  describe('fetchFileContent', () => {
    it('should fetch file content as blob (with dirPath)', () => {
      const mockBlob = new Blob(['File Content'], { type: 'text/plain' });

      const emissions: Result<Blob>[] = [];
      service.fetchFileContent('my-remote', 'my-dir', 'my-file.txt').subscribe((response) => {
        emissions.push(response);
      });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/rclone/[my-remote:]my-dir/my-file.txt`,
      );

      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toEqual('Bearer mockAccessToken');
      expect(req.request.responseType).toBe('blob');

      req.flush(mockBlob);

      expect(emissions).toEqual([toPending(), toSuccess(mockBlob)]);
    });

    it('should fetch file content as blob (without dirPath)', () => {
      const mockBlob = new Blob(['File Content'], { type: 'text/plain' });

      const emissions: Result<Blob>[] = [];
      service.fetchFileContent('my-remote', undefined, 'my-file.txt').subscribe((response) => {
        emissions.push(response);
      });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/rclone/[my-remote:]my-file.txt`,
      );

      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toEqual('Bearer mockAccessToken');
      expect(req.request.responseType).toBe('blob');

      req.flush(mockBlob);

      expect(emissions).toEqual([toPending(), toSuccess(mockBlob)]);
    });
  });

  describe('mkdirAsync', () => {
    it('should make an async POST request to create a folder', () => {
      const mockResponse = { jobid: 123 };
      const emissions: Result<AsyncJobResponse>[] = [];
      service.mkdirAsync('my-remote', 'my-dir').subscribe((response) => {
        emissions.push(response);
      });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/rclone/operations/mkdir`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        fs: 'my-remote:',
        remote: 'my-dir',
        _async: true,
      });
      req.flush(mockResponse);
      expect(emissions).toEqual([toPending(), toSuccess(mockResponse)]);
    });
  });

  describe('deleteFileAsync', () => {
    it('should make an async POST request to delete a file', () => {
      const mockResponse = { jobid: 123 };
      const emissions: Result<AsyncJobResponse>[] = [];
      service.deleteFileAsync('my-remote', 'file1.txt').subscribe((response) => {
        emissions.push(response);
      });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/rclone/operations/deletefile`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        fs: 'my-remote:',
        remote: 'file1.txt',
        _async: true,
      });

      req.flush(mockResponse);
      expect(emissions).toEqual([toPending(), toSuccess(mockResponse)]);
    });
  });

  describe('deleteFolderAsync', () => {
    it('should make an async POST request to purge a folder', () => {
      const mockResponse = { jobid: 124 };
      const emissions: Result<AsyncJobResponse>[] = [];
      service.deleteFolderAsync('my-remote', 'folder1').subscribe((response) => {
        emissions.push(response);
      });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/rclone/operations/purge`,
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        fs: 'my-remote:',
        remote: 'folder1',
        _async: true,
      });

      req.flush(mockResponse);
      expect(emissions).toEqual([toPending(), toSuccess(mockResponse)]);
    });
  });

  describe('moveFileAsync', () => {
    it('should move a file between remotes', () => {
      const mockResponse = { jobid: 127 };
      const emissions: Result<AsyncJobResponse>[] = [];
      service
        .moveFileAsync('remote1', 'file.txt', 'remote2', 'target.txt')
        .subscribe((response) => {
          emissions.push(response);
        });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/rclone/operations/movefile`,
      );
      expect(req.request.body).toEqual({
        srcFs: 'remote1:',
        srcRemote: 'file.txt',
        dstFs: 'remote2:',
        dstRemote: 'target.txt',
        _async: true,
      });

      req.flush(mockResponse);
      expect(emissions).toEqual([toPending(), toSuccess(mockResponse)]);
    });
  });

  describe('moveFolderAsync', () => {
    it('should move a folder between remotes', () => {
      const mockResponse = { jobid: 128 };
      const emissions: Result<AsyncJobResponse>[] = [];
      service.moveFolderAsync('remote1', 'dir1', 'remote2', 'dir2').subscribe((response) => {
        emissions.push(response);
      });

      const req = httpMock.expectOne(`${environment.webApiEndpoint}/api/v1/rclone/sync/move`);
      expect(req.request.body).toEqual({
        srcFs: 'remote1:dir1',
        dstFs: 'remote2:dir2',
        _async: true,
      });

      req.flush(mockResponse);
      expect(emissions).toEqual([toPending(), toSuccess(mockResponse)]);
    });
  });

  describe('copyFolderAsync', () => {
    it('should copy a folder between remotes', () => {
      const mockResponse = { jobid: 129 };
      const emissions: Result<AsyncJobResponse>[] = [];
      service.copyFolderAsync('remote1', 'dir1', 'remote2', 'dir2', true).subscribe((response) => {
        emissions.push(response);
      });

      const req = httpMock.expectOne(`${environment.webApiEndpoint}/api/v1/rclone/sync/copy`);
      expect(req.request.body).toEqual({
        srcFs: 'remote1:dir1',
        dstFs: 'remote2:dir2',
        createEmptySrcDirs: true,
        _async: true,
      });

      req.flush(mockResponse);
      expect(emissions).toEqual([toPending(), toSuccess(mockResponse)]);
    });
  });

  describe('copyFileAsync', () => {
    it('should copy a file between remotes', () => {
      const mockResponse = { jobid: 130 };
      const emissions: Result<AsyncJobResponse>[] = [];
      service
        .copyFileAsync('remote1', 'file.txt', 'remote2', 'target.txt')
        .subscribe((response) => {
          emissions.push(response);
        });

      const req = httpMock.expectOne(
        `${environment.webApiEndpoint}/api/v1/rclone/operations/copyfile`,
      );
      expect(req.request.body).toEqual({
        srcFs: 'remote1:',
        srcRemote: 'file.txt',
        dstFs: 'remote2:',
        dstRemote: 'target.txt',
        _async: true,
      });

      req.flush(mockResponse);
      expect(emissions).toEqual([toPending(), toSuccess(mockResponse)]);
    });
  });
});
