import { MediaViewerRequest } from '../../../media-viewer/media-viewer.request';
import { closeDialog, openDialog } from '../dialogs.actions';

describe('Dialog Actions', () => {
  it('should create an action to open a new dialog', () => {
    const mediaItemId = 'item123';
    const request = new MediaViewerRequest(mediaItemId);

    const action = openDialog({ request });

    expect(action.type).toBe(
      '[Dialog] Requests the dialog to be open with a particular request',
    );
    expect(action.request).toEqual(request);
  });

  it('should create an action to close any dialog', () => {
    const action = closeDialog();

    expect(action.type).toBe('[Dialog] Closes the dialog');
  });
});
