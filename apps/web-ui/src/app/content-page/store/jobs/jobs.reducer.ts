import { createFeature, createReducer, on } from '@ngrx/store';

import { setJobResult, assignJobId, setSubmitJobFailed } from './jobs.actions';
import { JobState, FEATURE_KEY, initialState } from './jobs.state';
import { Result, toPending } from '../../../shared/results/results';

export const jobsReducer = createReducer(
  initialState,

  on(setSubmitJobFailed, (state, { request, result }): JobState => {
    console.log('Setting submit job failed', request, result);
    const jobId = `failed-job-${Date.now()}`;
    return {
      ...state,
      jobIdToRequest: state.jobIdToRequest.set(jobId, request),
      jobIdToResult: state.jobIdToResult.set(jobId, result as Result<void>),
    };
  }),

  on(assignJobId, (state, { jobId, request, result }): JobState => {
    console.log('Assigning job id', jobId, request, result);
    return {
      ...state,
      jobIdToRequest: state.jobIdToRequest.set(jobId, request),
      jobIdToResult: state.jobIdToResult.set(jobId, result),
    };
  }),

  on(setJobResult, (state, { jobId, result }): JobState => {
    console.log('Setting job result', jobId, result);
    return {
      ...state,
      jobIdToResult: state.jobIdToResult.set(jobId, result),
    };
  }),
);

export const jobsFeature = createFeature({
  name: FEATURE_KEY,
  reducer: jobsReducer,
});
