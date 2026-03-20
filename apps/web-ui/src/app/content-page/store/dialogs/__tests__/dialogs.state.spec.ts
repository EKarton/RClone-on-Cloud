import { ChatDialogRequest } from '../../../chat-dialog/chat-dialog.request';
import { MediaViewerRequest } from '../../../media-viewer/media-viewer.request';
import {
  DialogState,
  initialState,
  selectDialogState,
  selectTopDialogRequest,
} from '../dialogs.state';

describe('Dialogs Selectors', () => {
  it('should select the entire Dialog state', () => {
    const result = selectDialogState.projector({ ...initialState });

    expect(result).toEqual(initialState);
  });

  describe('selectTopDialogRequest', () => {
    it('should return the request when the first request in the queue is an instance of the given ctor', () => {
      const request = new MediaViewerRequest('item123');
      const state: DialogState = {
        requests: [request],
      };

      const selector = selectTopDialogRequest(MediaViewerRequest);
      const result = selector.projector(state);

      expect(result).toBe(request);
    });

    it('should return null when the first request in the queue is not an instance of the given ctor', () => {
      const request = new ChatDialogRequest();
      const state: DialogState = {
        requests: [request],
      };

      const selector = selectTopDialogRequest(MediaViewerRequest);
      const result = selector.projector(state);

      expect(result).toBeNull();
    });

    it('should return null when requests queue is empty', () => {
      const state: DialogState = {
        requests: [],
      };

      const selector = selectTopDialogRequest(MediaViewerRequest);
      const result = selector.projector(state);

      expect(result).toBeNull();
    });
  });
});
