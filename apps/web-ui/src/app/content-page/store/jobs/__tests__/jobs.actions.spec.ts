import { Result, toFailure, toSuccess } from '../../../../shared/results/results';
import { AsyncJobResponse } from '../../../services/web-api/types/async-job';
import {
  assignJobId,
  pollJobStatus,
  setJobResult,
  setSubmitJobFailed,
  submitJob,
} from '../jobs.actions';
import { UploadFileRequest } from '../jobs.state';

const mockRequest = {
  kind: 'upload-file',
  remote: 'remote',
  dirPath: 'path',
  file: new File([], 'file.txt'),
} as UploadFileRequest;

describe('Jobs Actions', () => {
  it('should create an action to submit a job', () => {
    const action = submitJob({ request: mockRequest });

    expect(action.type).toBe('[Jobs] Requests to submit a job');
    expect(action.request).toEqual(mockRequest);
  });

  it('should create an action to set the result of a failed job submission', () => {
    const result = toFailure(new Error('Failed to upload file')) as Result<AsyncJobResponse>;

    const action = setSubmitJobFailed({ request: mockRequest, result });

    expect(action.type).toBe('[Jobs] Set submit job failed');
    expect(action.request).toEqual(mockRequest);
    expect(action.result).toEqual(result);
  });

  it('should create an action to assign a jobId to the job request', () => {
    const result = toSuccess(undefined) as Result<void>;

    const action = assignJobId({ jobId: 'jobId', request: mockRequest, result });

    expect(action.type).toBe('[Jobs] Assign job id');
    expect(action.jobId).toBe('jobId');
    expect(action.request).toEqual(mockRequest);
    expect(action.result).toEqual(result);
  });

  it('should create an action to poll the status of a job', () => {
    const jobId = 'jobId';

    const action = pollJobStatus({ jobId });

    expect(action.type).toBe('[Jobs] Poll job status');
    expect(action.jobId).toBe(jobId);
  });

  it('should create an action to set the result of a job', () => {
    const jobId = 'jobId';
    const result = toSuccess(undefined) as Result<void>;

    const action = setJobResult({ jobId, result });

    expect(action.type).toBe('[Jobs] Set job result');
    expect(action.jobId).toBe(jobId);
    expect(action.result).toEqual(result);
  });
});
