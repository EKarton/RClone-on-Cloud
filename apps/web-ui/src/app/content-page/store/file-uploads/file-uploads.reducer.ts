import { createFeature, createReducer, on } from '@ngrx/store';

import { setUploadFileResult } from './file-uploads.actions';
import { FileUploadState, FEATURE_KEY, initialState, UploadingFile } from './file-uploads.state';
import { mapResultToResult } from '../../../shared/results/utils/mapResultToResult';
import { toFailure, toPending, toSuccess } from '../../../shared/results/results';

export const fileUploadsReducer = createReducer(
  initialState,

  on(setUploadFileResult, (state, { request, result }): FileUploadState => {
    const uploadingFile: UploadingFile = {
      remote: request.remote,
      dirPath: request.dirPath,
      fileName: request.file.name,
    };

    const jobResult = mapResultToResult(result, (value) => {
      if (!value.finished) {
        return toPending<void>();
      }
      if (value.success) {
        return toSuccess<void>(undefined);
      }
      return toFailure<void>(new Error(value.error));
    });

    return {
      ...state,
      uploadingFilesToResult: state.uploadingFilesToResult.set(uploadingFile, jobResult),
      remoteDirPathToUploadingFiles: state.remoteDirPathToUploadingFiles.update(
        request.dirPath,
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
