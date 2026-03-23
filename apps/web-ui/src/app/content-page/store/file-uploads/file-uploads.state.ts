import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Map as ImmutableMap } from 'immutable';

import { Result } from '../../../shared/results/results';
import { JobStatusResponse } from '../../services/web-api/types/get-job-status';

/** Represents a file upload request */
export interface UploadFileRequest {
  remote: string;
  dirPath: string;
  file: File;
}

/** Represents an uploading file */
export interface UploadingFile {
  remote: string;
  dirPath: string;
  fileName: string;
}

/** The type defs of this NgRx store. */
export interface FileUploadState {
  uploadingFilesToResult: ImmutableMap<UploadingFile, Result<void>>;
  remoteDirPathToUploadingFiles: ImmutableMap<string, UploadingFile[]>;
}

/** The initial state of the NgRx store. */
export const initialState: FileUploadState = {
  uploadingFilesToResult: ImmutableMap<UploadingFile, Result<void>>(),
  remoteDirPathToUploadingFiles: ImmutableMap<string, UploadingFile[]>(),
};

/** The feature key shared with the reducer. */
export const FEATURE_KEY = 'File Uploads';

/** Returns the entire state of the dialog store */
export const selectFileUploadState = createFeatureSelector<FileUploadState>(FEATURE_KEY);

/** Returns all of the uploading files */
export const selectAllUploadingFiles = createSelector(
  selectFileUploadState,
  (state) => state.uploadingFilesToResult,
);

/** Returns all of the uploading files in a specific remote directory */
export const selectUploadingFilesInRemoteDirPath = (remoteDirPath: string) =>
  createSelector(selectFileUploadState, (state) =>
    state.remoteDirPathToUploadingFiles.get(remoteDirPath),
  );
