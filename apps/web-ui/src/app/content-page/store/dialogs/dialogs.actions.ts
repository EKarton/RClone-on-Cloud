import { createAction, props } from '@ngrx/store';

import { BaseDialogRequest } from './dialogs.state';

/** An action that requests for the dialog to be open. */
export const openDialog = createAction(
  '[Dialog] Requests the dialog to be open with a particular request',
  props<{ request: BaseDialogRequest }>(),
);

/** An action that closes the dialog. */
export const closeDialog = createAction('[Dialog] Closes the dialog');
