import { jobsReducer } from '../jobs.reducer';
import { setSubmitJobFailed, assignJobId, setJobResult } from '../jobs.actions';
import { initialState, MoveFileRequest } from '../jobs.state';
import { Result, toFailure, toPending, toSuccess } from '../../../../shared/results/results';

describe('Jobs Reducer', () => {
  it('should return the previous state for an unknown action', () => {
    const action = { type: 'Unknown' };
    const result = jobsReducer(initialState, action);
    expect(result).toBe(initialState);
  });

  describe('setSubmitJobFailed', () => {
    it('should set the job request and failed result with a generated failed-job ID', () => {
      const request: any = { kind: 'upload-file', file: new File([], 'test.txt') };
      const failedResult = toFailure(new Error('error'));
      const action = setSubmitJobFailed({ request, result: failedResult as any });

      const state = jobsReducer(initialState, action);

      const jobIds = state.jobIdToRequest.keySeq().toArray();
      expect(jobIds.length).toBe(1);
      const generatedId = jobIds[0];
      expect(generatedId.startsWith('failed-job-')).toBe(true);
      expect(state.jobIdToRequest.get(generatedId)).toEqual(request);
      expect(state.jobIdToResult.get(generatedId)).toEqual(failedResult);
    });
  });

  describe('assignJobId', () => {
    it('should set the job request and its initial result for the given jobId', () => {
      const request = {
        kind: 'move-file',
        fromRemote: 'r1',
        fromPath: 'p1',
        toRemote: 'r2',
        toPath: 'p2',
      } as MoveFileRequest;
      const result = toPending() as Result<void>;
      const action = assignJobId({ jobId: 'job-1', request, result });

      const state = jobsReducer(initialState, action);

      expect(state.jobIdToRequest.get('job-1')).toEqual(request);
      expect(state.jobIdToResult.get('job-1')).toEqual(result);
    });
  });

  describe('setJobResult', () => {
    it('should update the job result for the given jobId', () => {
      const request: any = { kind: 'move-file' };
      const action1 = assignJobId({ jobId: 'job-1', request, result: toPending<void>() });
      const state1 = jobsReducer(initialState, action1);

      const newResult = toSuccess(undefined);
      const action2 = setJobResult({ jobId: 'job-1', result: newResult });
      const state2 = jobsReducer(state1, action2);

      expect(state2.jobIdToRequest.get('job-1')).toEqual(request);
      expect(state2.jobIdToResult.get('job-1')).toEqual(newResult);
    });
  });
});
