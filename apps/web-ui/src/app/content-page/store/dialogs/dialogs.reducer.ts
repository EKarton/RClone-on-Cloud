import { createFeature, createReducer, on } from '@ngrx/store';

import { closeDialog, openDialog } from './dialogs.actions';
import { DialogState, FEATURE_KEY, initialState } from './dialogs.state';

export const dialogReducer = createReducer(
  initialState,

  on(openDialog, (state, { request }): DialogState => {
    return {
      requests: [...state.requests, request],
    };
  }),

  on(closeDialog, (state): DialogState => {
    return {
      requests: state.requests.slice(0, -1),
    };
  }),
);

export const dialogFeature = createFeature({
  name: FEATURE_KEY,
  reducer: dialogReducer,
});
