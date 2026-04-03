import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, switchMap, take } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { authState } from '../../../auth/store';
import { Result } from '../../../shared/results/results';
import { mapResultRxJs } from '../../../shared/results/rxjs/mapResultRxJs';
import { toResult } from '../../../shared/results/rxjs/toResult';
import { ListFolderResponse, RawListFolderResponse } from './types/list-folder';
import { ListRemoteUsageResponse } from './types/list-remote-usage';
import { ListRemotesResponse } from './types/list-remotes';
import { JobStatusResponse } from './types/get-job-status';
import { AsyncJobResponse } from './types/async-job';

@Injectable({ providedIn: 'root' })
export class WebApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly store = inject(Store);

  /** Gets the status of a job */
  getJobStatus(jobId: string): Observable<Result<JobStatusResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/job/status`;
    const requestBody = {
      jobid: jobId,
    };
    return this.post<JobStatusResponse>(url, requestBody);
  }

  /** Uploads a file to a remote asynchronously */
  uploadFile(remote: string, dirPath: string, file: File): Observable<Result<void>> {
    const url =
      `${environment.webApiEndpoint}/api/v1/rclone/operations/uploadfile` +
      `?fs=${encodeURIComponent(remote + ':')}` +
      `&remote=${encodeURIComponent(dirPath)}`;

    const formData = new FormData();
    formData.append('file', file);

    return this.store.select(authState.selectAuthToken).pipe(
      take(1),
      switchMap((authToken) =>
        this.httpClient.post<void>(url, formData, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }),
      ),
      toResult(),
    );
  }

  /** Creates a folder on a remote */
  mkdir(remote: string, dirPath: string): Observable<Result<void>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/operations/mkdir`;
    const requestBody = {
      fs: `${remote}:`,
      remote: dirPath,
    };
    return this.post<void>(url, requestBody);
  }

  /** Creates a folder on a remote asynchronously */
  mkdirAsync(remote: string, dirPath: string): Observable<Result<AsyncJobResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/operations/mkdir`;
    const requestBody = {
      fs: `${remote}:`,
      remote: dirPath,
      _async: true,
    };
    return this.post<AsyncJobResponse>(url, requestBody);
  }

  /** Lists the contents of a folder */
  listFolder(remote: string, path: string): Observable<Result<ListFolderResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/operations/list`;
    const requestBody = {
      fs: `${remote}:`,
      remote: path,
      _config: {
        UseListR: true,
      },
    };
    return this.post<RawListFolderResponse>(url, requestBody).pipe(
      mapResultRxJs((res) => ({
        items: res.list.map((item) => ({
          path: item.Path,
          name: item.Name,
          size: item.Size,
          mimeType: item.MimeType,
          modTime: item.ModTime ? new Date(item.ModTime) : undefined,
          isDir: item.IsDir,
        })),
      })),
    );
  }

  /** List the remote usage */
  listRemoteUsage(remote: string): Observable<Result<ListRemoteUsageResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/operations/about`;
    return this.post<ListRemoteUsageResponse>(url, { fs: `${remote}:` });
  }

  /** Lists the rclone remotes available */
  listRemotes(): Observable<Result<ListRemotesResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/config/listremotes`;
    return this.post<ListRemotesResponse>(url, {});
  }

  /** Fetches the raw content of a file as a Blob */
  fetchFileContent(
    remote: string,
    dirPath: string | undefined,
    fileName: string,
  ): Observable<Result<Blob>> {
    const filePath = dirPath ? `${dirPath}/${fileName}` : fileName;
    const url = `${environment.webApiEndpoint}/api/v1/rclone/[${remote}:]${filePath}`;
    return this.store.select(authState.selectAuthToken).pipe(
      take(1),
      switchMap((authToken) =>
        this.httpClient.get(url, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          responseType: 'blob',
        }),
      ),
      toResult(),
    );
  }

  /** Deletes a file from a remote file path */
  deleteFileAsync(remote: string, path: string): Observable<Result<AsyncJobResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/operations/deletefile`;
    const requestBody = {
      fs: `${remote}:`,
      remote: path,
      _async: true,
    };
    return this.post<AsyncJobResponse>(url, requestBody);
  }

  /** Deletes a folder from a remote dir path */
  deleteFolderAsync(remote: string, path: string): Observable<Result<AsyncJobResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/operations/purge`;
    const requestBody = {
      fs: `${remote}:`,
      remote: path,
      _async: true,
    };
    return this.post<AsyncJobResponse>(url, requestBody);
  }

  /** Moves a file from a source remote file path to a target remote file path */
  moveFileAsync(
    fromRemote: string,
    fromPath: string,
    toRemote: string,
    toPath: string,
  ): Observable<Result<AsyncJobResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/operations/movefile`;
    const requestBody = {
      srcFs: `${fromRemote}:`,
      srcRemote: fromPath,
      dstFs: `${toRemote}:`,
      dstRemote: toPath,
      _async: true,
    };
    return this.post<AsyncJobResponse>(url, requestBody);
  }

  /** Moves a folder from a source remote dir path to a target remote dir path */
  moveFolderAsync(
    fromRemote: string,
    fromPath: string,
    toRemote: string,
    toPath: string,
  ): Observable<Result<AsyncJobResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/sync/move`;
    const requestBody = {
      srcFs: `${fromRemote}:${fromPath}`,
      dstFs: `${toRemote}:${toPath}`,
      _async: true,
    };
    return this.post<AsyncJobResponse>(url, requestBody);
  }

  /** Copies a folder from a source remote dir path to a target remote dir path */
  copyFolderAsync(
    fromRemote: string,
    fromPath: string,
    toRemote: string,
    toPath: string,
    createEmptySrcDirs: boolean,
  ): Observable<Result<AsyncJobResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/sync/copy`;
    const requestBody = {
      srcFs: `${fromRemote}:${fromPath}`,
      dstFs: `${toRemote}:${toPath}`,
      createEmptySrcDirs,
      _async: true,
    };
    return this.post<AsyncJobResponse>(url, requestBody);
  }

  /** Copies a file from a source remote file path to a target remote file path */
  copyFileAsync(
    fromRemote: string,
    fromPath: string,
    toRemote: string,
    toPath: string,
  ): Observable<Result<AsyncJobResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/operations/copyfile`;
    const requestBody = {
      srcFs: `${fromRemote}:`,
      srcRemote: fromPath,
      dstFs: `${toRemote}:`,
      dstRemote: toPath,
      _async: true,
    };
    return this.post<AsyncJobResponse>(url, requestBody);
  }

  private post<T>(url: string, body: unknown): Observable<Result<T>> {
    return this.store.select(authState.selectAuthToken).pipe(
      take(1),
      switchMap((authToken) =>
        this.httpClient.post<T>(url, body, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }),
      ),
      toResult(),
    );
  }
}
