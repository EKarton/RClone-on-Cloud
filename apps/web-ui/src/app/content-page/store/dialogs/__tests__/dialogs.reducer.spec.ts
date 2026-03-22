import { FileViewerRequest } from '../../../file-viewer/file-viewer.request';
import { closeDialog, openDialog } from '../dialogs.actions';
import { dialogReducer } from '../dialogs.reducer';
import { DialogState, initialState } from '../dialogs.state';

describe('Dialogs Reducer', () => {
  it('should handle openDialog action with a dialog request', () => {
    const request = new FileViewerRequest('remote', 'path', 'file.txt', 'text/plain');

    const action = openDialog({ request });
    const state = dialogReducer(initialState, action);

    const expectedState: DialogState = {
      ...initialState,
      requests: [request],
    };
    expect(state).toEqual(expectedState);
  });

  it('should handle closeDialog action', () => {
    const initialStateWithRequest: DialogState = {
      ...initialState,
      requests: [new FileViewerRequest('remote', 'path', 'file.txt', 'text/plain')],
    };

    const action = closeDialog();
    const state = dialogReducer(initialStateWithRequest, action);

    const expectedState: DialogState = {
      ...initialStateWithRequest,
      requests: [],
    };
    expect(state).toEqual(expectedState);
  });
});
