import { createAction, props } from '@ngrx/store';

import { JobRequest } from './jobs.state';
import { Result } from '../../../shared/results/results';
import { AsyncJobResponse } from '../../services/web-api/types/async-job';

/** An action that requests to upload a file. */
export const submitJob = createAction(
  '[Jobs] Requests to submit a job',
  props<{ request: JobRequest }>(),
);

/** An action that sets the result of a failed job submission. */
export const setSubmitJobFailed = createAction(
  '[Jobs] Set submit job failed',
  props<{ request: JobRequest; result: Result<AsyncJobResponse> }>(),
);

/** An action that assigns a jobId to the job request */
export const assignJobId = createAction(
  '[Jobs] Assign job id',
  props<{ jobId: string; request: JobRequest; result: Result<void> }>(),
);

/** An action that requests to poll the status of a job */
export const pollJobStatus = createAction('[Jobs] Poll job status', props<{ jobId: string }>());

/** An action that sets the result of a job. */
export const setJobResult = createAction(
  '[Jobs] Set job result',
  props<{ jobId: string; result: Result<void> }>(),
);
