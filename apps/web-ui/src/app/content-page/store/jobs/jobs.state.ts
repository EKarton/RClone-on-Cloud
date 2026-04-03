import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Map as ImmutableMap } from 'immutable';

import { Result, toPending } from '../../../shared/results/results';

export interface UploadFileRequest {
  kind: 'upload-file';
  remote: string;
  dirPath: string | undefined;
  file: File;
}

export interface DeleteFileRequest {
  kind: 'delete-file';
  remote: string;
  path: string;
}

export interface DeleteFolderRequest {
  kind: 'delete-folder';
  remote: string;
  path: string;
}

export interface MoveFileRequest {
  kind: 'move-file';
  fromRemote: string;
  fromPath: string;
  toRemote: string;
  toPath: string;
}

export interface MoveFolderRequest {
  kind: 'move-folder';
  fromRemote: string;
  fromPath: string;
  toRemote: string;
  toPath: string;
}

export interface CopyFileRequest {
  kind: 'copy-file';
  fromRemote: string;
  fromPath: string;
  toRemote: string;
  toPath: string;
}

export interface CopyFolderRequest {
  kind: 'copy-folder';
  fromRemote: string;
  fromPath: string;
  toRemote: string;
  toPath: string;
  createEmptySrcDirs: boolean;
}

export interface MkdirRequest {
  kind: 'mkdir';
  remote: string;
  dirPath: string;
}

export type JobRequest =
  | UploadFileRequest
  | DeleteFileRequest
  | DeleteFolderRequest
  | MoveFileRequest
  | MoveFolderRequest
  | CopyFileRequest
  | CopyFolderRequest
  | MkdirRequest;

/** The type defs of this NgRx store. */
export interface JobState {
  jobIdToResult: ImmutableMap<string, Result<void>>;
  jobIdToRequest: ImmutableMap<string, JobRequest>;
}

/** The initial state of the NgRx store. */
export const initialState: JobState = {
  jobIdToResult: ImmutableMap<string, Result<void>>(),
  jobIdToRequest: ImmutableMap<string, JobRequest>(),
};

/** The feature key shared with the reducer. */
export const FEATURE_KEY = 'Jobs';

/** Returns the entire state of the dialog store */
export const selectJobState = createFeatureSelector<JobState>(FEATURE_KEY);

export const selectJobResult = (jobId: string) =>
  createSelector(selectJobState, (state) => state.jobIdToResult.get(jobId));

export const selectJobRequest = (jobId: string) =>
  createSelector(selectJobState, (state) => state.jobIdToRequest.get(jobId));

/** Returns all of jobs with their results */
export const selectAllJobs = createSelector(selectJobState, (state) =>
  state.jobIdToRequest
    .entrySeq()
    .map(([jobId, request]) => {
      return {
        key: jobId,
        ...request,
        result: state.jobIdToResult.get(jobId) ?? toPending<void>(),
      };
    })
    .toList(),
);
