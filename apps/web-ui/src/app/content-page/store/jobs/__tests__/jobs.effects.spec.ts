import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { vi, Mock } from 'vitest';
import { Map as ImmutableMap } from 'immutable';

import { JobsEffects } from '../jobs.effects';
import { WebApiService } from '../../../services/web-api/web-api.service';
import * as jobsActions from '../jobs.actions';
import { toFailure, toPending, toSuccess } from '../../../../shared/results/results';
import { jobsState } from '../index';
import { JobRequest } from '../jobs.state';

describe('JobsEffects', () => {
  let actions$: Observable<Action>;
  let effects: JobsEffects;
  let webApiService: {
    uploadFile: Mock;
    deleteFileAsync: Mock;
    deleteFolderAsync: Mock;
    moveFileAsync: Mock;
    moveFolderAsync: Mock;
    copyFileAsync: Mock;
    copyFolderAsync: Mock;
    getJobStatus: Mock;
  };
  let store: MockStore;

  beforeEach(() => {
    webApiService = {
      uploadFile: vi.fn(),
      deleteFileAsync: vi.fn(),
      deleteFolderAsync: vi.fn(),
      moveFileAsync: vi.fn(),
      moveFolderAsync: vi.fn(),
      copyFileAsync: vi.fn(),
      copyFolderAsync: vi.fn(),
      getJobStatus: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        JobsEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            [jobsState.FEATURE_KEY]: jobsState.initialState,
          },
        }),
        { provide: WebApiService, useValue: webApiService },
      ],
    });

    effects = TestBed.inject(JobsEffects);
    store = TestBed.inject(MockStore);
  });

  describe('submitJob$', () => {
    it('should handle upload-file and dispatch assignJobId', () => {
      const request: JobRequest = {
        kind: 'upload-file',
        remote: 'drive',
        dirPath: 'folder',
        file: new File([], 'test.txt'),
      };
      actions$ = of(jobsActions.submitJob({ request }));

      const successResult = toSuccess(undefined);
      webApiService.uploadFile.mockReturnValue(of(successResult));

      let emittedAction:
        | { type: string; jobId?: string; request?: JobRequest; result?: unknown }
        | undefined = undefined;
      effects.submitJob$.subscribe((action) => {
        emittedAction = action as typeof emittedAction;
      });

      expect(webApiService.uploadFile).toHaveBeenCalledWith('drive', 'folder', request.file);
      expect(emittedAction!.type).toBe(jobsActions.assignJobId.type);
      expect(emittedAction!.jobId).toContain('upload-');
      expect(emittedAction!.request).toEqual(request);
      expect(emittedAction!.result).toEqual(successResult);
    });

    it('should handle async operations like move-file and dispatch assignJobId with pending result', () => {
      const request: JobRequest = {
        kind: 'move-file',
        fromRemote: 'src',
        fromPath: 'f',
        toRemote: 'dst',
        toPath: 't',
      };
      actions$ = of(jobsActions.submitJob({ request }));

      const response = toSuccess({ jobid: 123 });
      webApiService.moveFileAsync.mockReturnValue(of(response));

      let emittedAction:
        | { type: string; jobId?: string; request?: JobRequest; result?: unknown }
        | undefined = undefined;
      effects.submitJob$.subscribe((action) => {
        emittedAction = action as typeof emittedAction;
      });

      expect(webApiService.moveFileAsync).toHaveBeenCalledWith('src', 'f', 'dst', 't');
      expect(emittedAction!.type).toBe(jobsActions.assignJobId.type);
      expect(emittedAction!.jobId).toBe('123');
      expect(emittedAction!.request).toEqual(request);
      expect(emittedAction!.result).toEqual(toPending<void>());
    });

    it('should handle submit error correctly and dispatch setSubmitJobFailed', () => {
      const request: JobRequest = { kind: 'delete-file', remote: 'src', path: 'f' };
      actions$ = of(jobsActions.submitJob({ request }));

      const failureResult = toFailure(new Error('failed'));
      webApiService.deleteFileAsync.mockReturnValue(of(failureResult));

      let emittedAction:
        | { type: string; jobId?: string; request?: JobRequest; result?: unknown }
        | undefined = undefined;
      effects.submitJob$.subscribe((action) => {
        emittedAction = action as typeof emittedAction;
      });

      expect(emittedAction!.type).toBe(jobsActions.setSubmitJobFailed.type);
      expect(emittedAction!.request).toEqual(request);
      expect(emittedAction!.result).toEqual(failureResult);
    });
  });

  describe('startPolling$', () => {
    it('should dispatch pollJobStatus for non-upload jobs', () => {
      const request: JobRequest = {
        kind: 'move-file',
        fromRemote: 'r1',
        fromPath: 'p1',
        toRemote: 'r2',
        toPath: 'p2',
      };
      store.overrideSelector(jobsState.selectJobState, {
        jobIdToRequest: ImmutableMap([['123', request]]),
        jobIdToResult: ImmutableMap(),
      } as unknown as jobsState.JobState);
      store.refreshState();

      actions$ = of(jobsActions.assignJobId({ jobId: '123', request, result: toPending<void>() }));

      let emittedAction:
        | { type: string; jobId?: string; request?: JobRequest; result?: unknown }
        | undefined = undefined;
      effects.startPolling$.subscribe((action) => {
        emittedAction = action as typeof emittedAction;
      });

      expect(emittedAction!.type).toBe(jobsActions.pollJobStatus.type);
      expect(emittedAction!.jobId).toBe('123');
    });

    it('should not dispatch pollJobStatus for upload jobs', () => {
      const request: JobRequest = {
        kind: 'upload-file',
        remote: 'drive',
        dirPath: 'folder',
        file: new File([], 'test.txt'),
      };
      store.overrideSelector(jobsState.selectJobState, {
        jobIdToRequest: ImmutableMap([['123', request]]),
        jobIdToResult: ImmutableMap(),
      } as unknown as jobsState.JobState);
      store.refreshState();

      actions$ = of(jobsActions.assignJobId({ jobId: '123', request, result: toPending<void>() }));

      let emittedAction: { type: string; jobId?: string; result?: unknown } | undefined;
      effects.startPolling$.subscribe((action) => {
        emittedAction = action as typeof emittedAction;
      });

      expect(emittedAction).toBeUndefined();
    });
  });
});
