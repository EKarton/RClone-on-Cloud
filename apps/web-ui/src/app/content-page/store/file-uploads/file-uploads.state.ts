import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Map as ImmutableMap, Set as ImmutableSet } from 'immutable';

import { Result } from '../../../shared/results/results';

/** Represents a file upload request */
export interface UploadFileRequest {
  remote: string;
  dirPath: string | undefined;
  file: File;
}

/** Represents an uploading file */
export type UploadingFile = {
  remote: string;
  dirPath: string | undefined;
  fileName: string;
};

export type UploadingFileKey = string;

/** The type defs of this NgRx store. */
export interface FileUploadState {
  keyToUploadingFiles: ImmutableMap<UploadingFileKey, UploadingFile>;
  keyToResult: ImmutableMap<UploadingFileKey, Result<void>>;
  remoteDirPathToKeys: ImmutableMap<string, ImmutableSet<UploadingFileKey>>;
}

/** The initial state of the NgRx store. */
export const initialState: FileUploadState = {
  keyToUploadingFiles: ImmutableMap<UploadingFileKey, UploadingFile>(),
  keyToResult: ImmutableMap<UploadingFileKey, Result<void>>(),
  remoteDirPathToKeys: ImmutableMap<string, ImmutableSet<UploadingFileKey>>(),
};

/** The feature key shared with the reducer. */
export const FEATURE_KEY = 'File Uploads';

/** Returns the entire state of the dialog store */
export const selectFileUploadState = createFeatureSelector<FileUploadState>(FEATURE_KEY);

/** Returns all of the uploading files with their results in a specific remote directory */
export const selectUploadingFilesInRemoteDirPath = (remoteDirPath: string) =>
  createSelector(selectFileUploadState, (state) =>
    state.remoteDirPathToKeys.get(remoteDirPath, []).map((uploadingFileKey) => {
      return {
        key: uploadingFileKey,
        ...state.keyToUploadingFiles.get(uploadingFileKey)!,
        result: state.keyToResult.get(uploadingFileKey)!,
      };
    }),
  );

/** Returns all of the uploading files with their results */
export const selectAllUploadingFiles = createSelector(selectFileUploadState, (state) =>
  state.keyToUploadingFiles
    .entrySeq()
    .map(([uploadingFileKey, uploadingFile]) => {
      return {
        key: uploadingFileKey,
        ...uploadingFile,
        result: state.keyToResult.get(uploadingFileKey)!,
      };
    })
    .toList(),
);
