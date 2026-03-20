import { createFeatureSelector, createSelector } from '@ngrx/store';

/** Represents a request to open a dialog. All dialog types must extend from this.  */
export type BaseDialogRequest = object;

/** The type defs of this NgRx store. */
export interface DialogState {
  requests: BaseDialogRequest[];
}

/** The initial state of the NgRx store. */
export const initialState: DialogState = {
  requests: [],
};

/** The feature key shared with the reducer. */
export const FEATURE_KEY = 'Dialog';

/** Returns the entire state of the dialog store */
export const selectDialogState =
  createFeatureSelector<DialogState>(FEATURE_KEY);

/** Returns the request for a particular dialog type if that dialog type is the top most dialog */
export const selectTopDialogRequest = <T extends BaseDialogRequest>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctor: new (...args: any[]) => T,
) =>
  createSelector(selectDialogState, (state) =>
    state.requests.length > 0 &&
    state.requests[state.requests.length - 1] instanceof ctor
      ? (state.requests[state.requests.length - 1] as T)
      : null,
  );
