import { ListFolderItem } from '../../services/web-api/types/list-folder';
import { BaseDialogRequest } from '../../store/dialogs/dialogs.state';

/** Represents a request to open the file viewer with a particular file. */
export class DeleteItemsDialogRequest implements BaseDialogRequest {
  constructor(public item: ListFolderItem) {}
}
