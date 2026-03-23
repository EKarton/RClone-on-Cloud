import { createAction, props } from '@ngrx/store';

import { UploadFileRequest } from './file-uploads.state';
import { Result } from '../../../shared/results/results';

/** An action that requests to upload a file. */
export const uploadFile = createAction(
  '[File Upload] Requests to upload a file',
  props<{ request: UploadFileRequest }>(),
);

export const setUploadFileResult = createAction(
  '[File Upload] Set upload file result',
  props<{ request: UploadFileRequest; result: Result<void> }>(),
);
