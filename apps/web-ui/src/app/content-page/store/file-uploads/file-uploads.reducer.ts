import { createFeature, createReducer, on } from '@ngrx/store';
import { Map as ImmutableMap, Set as ImmutableSet } from 'immutable';

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

    const uploadingFileKey = `${uploadingFile.remote}::${uploadingFile.dirPath ?? ''}::${uploadingFile.fileName}`;

    const remoteDirPath = `${request.remote}:${request.dirPath ?? ''}`;
    console.log('remoteDirPath', remoteDirPath);
    console.log('uploadingFile', uploadingFile);
    console.log('result', result);

    const newState: FileUploadState = {
      keyToUploadingFiles: state.keyToUploadingFiles.set(uploadingFileKey, uploadingFile),
      keyToResult: state.keyToResult.set(uploadingFileKey, result),
      remoteDirPathToKeys: state.remoteDirPathToKeys.update(remoteDirPath, (keys) => {
        if (!keys) {
          return ImmutableSet.of(uploadingFileKey);
        }
        return keys.add(uploadingFileKey);
      }),
    };
    console.log('I am here', newState);
    return newState;
  }),
);

export const fileUploadsFeature = createFeature({
  name: FEATURE_KEY,
  reducer: fileUploadsReducer,
});
