import { Map as ImmutableMap } from 'immutable';
import { selectJobResult, selectJobRequest, selectAllJobs, JobState } from '../jobs.state';
import { toPending, toSuccess } from '../../../../shared/results/results';

describe('Jobs Selectors', () => {
  let mockState: JobState;

  beforeEach(() => {
    mockState = {
      jobIdToRequest: ImmutableMap({
        'job-1': { kind: 'upload-file', remote: 'r1', dirPath: 'd1', file: new File([], 'f1.txt') } as any,
        'job-2': { kind: 'delete-file', remote: 'r2', path: 'p2' } as any,
      }),
      jobIdToResult: ImmutableMap({
        'job-1': toPending<void>(),
        'job-2': toSuccess(undefined),
      }),
    };
  });

  describe('selectJobResult', () => {
    it('should return the result for a specific jobId', () => {
      const result = selectJobResult('job-1').projector(mockState);
      expect(result).toEqual(toPending<void>());
    });

    it('should return undefined if jobId does not exist', () => {
      const result = selectJobResult('non-existent').projector(mockState);
      expect(result).toBeUndefined();
    });
  });

  describe('selectJobRequest', () => {
    it('should return the request for a specific jobId', () => {
      const result = selectJobRequest('job-2').projector(mockState);
      expect(result).toEqual({ kind: 'delete-file', remote: 'r2', path: 'p2' });
    });

    it('should return undefined if jobId does not exist', () => {
      const result = selectJobRequest('non-existent').projector(mockState);
      expect(result).toBeUndefined();
    });
  });

  describe('selectAllJobs', () => {
    it('should map over all requests and combine them with results and keys into an Immutable List', () => {
      const result = selectAllJobs.projector(mockState);

      expect(result.size).toBe(2);
      
      const job1 = result.find(j => j.key === 'job-1');
      expect(job1).toBeDefined();
      expect(job1!.kind).toBe('upload-file');
      expect(job1!.result).toEqual(toPending<void>());

      const job2 = result.find(j => j.key === 'job-2');
      expect(job2).toBeDefined();
      expect(job2!.kind).toBe('delete-file');
      expect(job2!.result).toEqual(toSuccess(undefined));
    });

    it('should return an empty list if there are no jobs', () => {
      const emptyState: JobState = {
        jobIdToRequest: ImmutableMap(),
        jobIdToResult: ImmutableMap(),
      };
      const result = selectAllJobs.projector(emptyState);
      expect(result.size).toBe(0);
    });
  });
});
