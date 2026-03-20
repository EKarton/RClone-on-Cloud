import { BaseDialogRequest } from '../store/dialogs/dialogs.state';

/** Represents a request to open the media viewer with a particular media item ID. */
export class MediaViewerRequest implements BaseDialogRequest {
  constructor(public mediaItemId: string) {}
}
