import { createFeature, createReducer, on } from '@ngrx/store';

import { setUploadFileResult } from './file-uploads.actions';
import { FileUploadState, FEATURE_KEY, initialState, UploadingFile } from './file-uploads.state';

export const fileUploadsReducer = createReducer(
  initialState,

  on(setUploadFileResult, (state, { request, result }): FileUploadState => {
    const uploadingFile: UploadingFile = {
      remote: request.remote,
      dirPath: request.dirPath,
      fileName: request.file.name,
    };

    const remoteDirPath = `${request.remote}:${request.dirPath ?? ''}`;
    console.log('remoteDirPath', remoteDirPath);

    return {
      ...state,
      uploadingFilesToResult: state.uploadingFilesToResult.set(uploadingFile, result),
      remoteDirPathToUploadingFiles: state.remoteDirPathToUploadingFiles.update(
        remoteDirPath,
        (files) => {
          if (!files) {
            return [uploadingFile];
          }
          return [...files, uploadingFile];
        },
      ),
    };
  }),
);

export const fileUploadsFeature = createFeature({
  name: FEATURE_KEY,
  reducer: fileUploadsReducer,
});
