import { BaseDialogRequest } from '../store/dialogs/dialogs.state';

/** Represents a request to open the file viewer with a particular file. */
export class FileViewerRequest implements BaseDialogRequest {
  constructor(
    public remote: string,
    public dirPath: string | undefined,
    public fileName: string,
    public mimeType: string,
  ) {}
}
