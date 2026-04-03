import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, filter, map, mergeMap, take, takeWhile } from 'rxjs/operators';

import * as jobsActions from './jobs.actions';
import { concat, Observable, of, throwError, timer } from 'rxjs';
import {
  hasFailed,
  hasSucceed,
  isPending,
  Result,
  toFailure,
  toPending,
  toSuccess,
} from '../../../shared/results/results';
import { WebApiService } from '../../services/web-api/web-api.service';
import { JobRequest } from './jobs.state';
import { AsyncJobResponse } from '../../services/web-api/types/async-job';
import { Store } from '@ngrx/store';
import { jobsState } from '.';

@Injectable()
export class JobsEffects {
  private readonly actions$ = inject(Actions);
  private readonly webApiService = inject(WebApiService);
  private readonly store = inject(Store);

  private uploadCounter = 0;

  submitJob$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(jobsActions.submitJob),
      mergeMap(({ request }) => {
        if (request.kind === 'upload-file') {
          const jobId = `upload-${this.uploadCounter++}`;
          return this.webApiService
            .uploadFile(request.remote, request.dirPath ?? '', request.file)
            .pipe(
              map((result) => {
                console.log('Upload result', result);
                return jobsActions.assignJobId({
                  jobId,
                  request,
                  result: result as Result<void>,
                });
              }),
            );
        }

        return this.submitJob(request).pipe(
          filter((result) => !isPending(result)),
          map((result) => {
            if (hasFailed(result)) {
              return jobsActions.setSubmitJobFailed({
                request,
                result,
              });
            }

            return jobsActions.assignJobId({
              request,
              jobId: result.data!.jobid.toString(),
              result: toPending(),
            });
          }),
        );
      }),
    );
  });

  private submitJob(request: JobRequest): Observable<Result<AsyncJobResponse>> {
    switch (request.kind) {
      case 'delete-file':
        return this.webApiService.deleteFileAsync(request.remote, request.path);
      case 'delete-folder':
        return this.webApiService.deleteFolderAsync(request.remote, request.path);
      case 'move-file':
        return this.webApiService.moveFileAsync(
          request.fromRemote,
          request.fromPath,
          request.toRemote,
          request.toPath,
        );
      case 'move-folder':
        return this.webApiService.moveFolderAsync(
          request.fromRemote,
          request.fromPath,
          request.toRemote,
          request.toPath,
        );
      case 'copy-file':
        return this.webApiService.copyFileAsync(
          request.fromRemote,
          request.fromPath,
          request.toRemote,
          request.toPath,
        );
      case 'copy-folder':
        return this.webApiService.copyFolderAsync(
          request.fromRemote,
          request.fromPath,
          request.toRemote,
          request.toPath,
          request.createEmptySrcDirs,
        );
      case 'mkdir':
        return this.webApiService.mkdirAsync(request.remote, request.dirPath);
      default:
        return throwError(() => new Error(`Job request type ${request.kind} not implemented`));
    }
  }

  startPolling$ = createEffect(() =>
    this.actions$.pipe(
      ofType(jobsActions.assignJobId),
      mergeMap(({ jobId }) => {
        return this.store.select(jobsState.selectJobRequest(jobId)).pipe(
          take(1),
          filter((request) => request?.kind !== 'upload-file'),
          map(() => {
            return jobsActions.pollJobStatus({ jobId });
          }),
        );
      }),
    ),
  );

  pollJobStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(jobsActions.pollJobStatus),
      mergeMap(({ jobId }) =>
        concat(
          of(jobsActions.setJobResult({ jobId, result: toPending<void>() })),
          timer(0, 2000).pipe(
            exhaustMap(() => this.webApiService.getJobStatus(jobId)),
            map((result) => {
              if (hasFailed(result)) {
                return jobsActions.setJobResult({
                  jobId,
                  result: result as Result<void>,
                });
              }

              if (isPending(result)) {
                return jobsActions.setJobResult({
                  jobId,
                  result: toPending<void>(),
                });
              }

              if (result.data!.error) {
                return jobsActions.setJobResult({
                  jobId,
                  result: toFailure(new Error(result.data!.error)) as Result<void>,
                });
              }

              if (result.data!.success === true) {
                return jobsActions.setJobResult({
                  jobId,
                  result: toSuccess('') as Result<void>,
                });
              }

              return jobsActions.setJobResult({
                jobId,
                result: toPending<void>(),
              });
            }),
            takeWhile((action) => !hasFailed(action.result) && !hasSucceed(action.result), true),
          ),
        ),
      ),
    ),
  );
}
