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

@Injectable({ providedIn: 'root' })
export class WebApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly store = inject(Store);

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
    return this.store.select(authState.selectAuthToken).pipe(
      take(1),
      switchMap((authToken) =>
        this.httpClient.post<RawListFolderResponse>(url, requestBody, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }),
      ),
      toResult(),
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
    return this.store.select(authState.selectAuthToken).pipe(
      take(1),
      switchMap((authToken) =>
        this.httpClient.post<ListRemoteUsageResponse>(
          url,
          { fs: `${remote}:` },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          },
        ),
      ),
      toResult(),
    );
  }

  /** Lists the rclone remotes available */
  listRemotes(): Observable<Result<ListRemotesResponse>> {
    const url = `${environment.webApiEndpoint}/api/v1/rclone/config/listremotes`;
    return this.store.select(authState.selectAuthToken).pipe(
      take(1),
      switchMap((authToken) =>
        this.httpClient.post<ListRemotesResponse>(
          url,
          {},
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          },
        ),
      ),
      toResult(),
    );
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
}
