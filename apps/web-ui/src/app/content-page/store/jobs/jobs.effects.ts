import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatMap, filter, map, mergeMap, switchMap, take, takeWhile } from 'rxjs/operators';

import * as jobsActions from './jobs.actions';
import { concat, Observable, of, throwError, timer } from 'rxjs';
import {
  hasFailed,
  hasSucceed,
  isPending,
  Result,
  toPending,
  toSuccess,
} from '../../../shared/results/results';
import { WebApiService } from '../../services/web-api/web-api.service';
import { JobRequest } from './jobs.state';
import { AsyncJobResponse } from '../../services/web-api/types/async-job';
import { mapResultRxJs } from '../../../shared/results/rxjs/mapResultRxJs';
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
          map(() => jobsActions.pollJobStatus({ jobId })),
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
            switchMap(() => this.webApiService.getJobStatus(jobId)),
            takeWhile((result) => hasSucceed(result) && result.data!.success !== true, true),
            concatMap((result) => {
              if (hasFailed(result) || isPending(result)) {
                return of(
                  jobsActions.setJobResult({
                    jobId,
                    result: result as Result<void>,
                  }),
                );
              }

              if (result.data!.success) {
                return of(
                  jobsActions.setJobResult({
                    jobId,
                    result: toSuccess('') as Result<void>,
                  }),
                );
              }

              return of(jobsActions.setJobResult({ jobId, result: toPending<void>() }));
            }),
          ),
        ),
      ),
    ),
  );
}
