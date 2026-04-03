import { ListFolderItem } from '../../services/web-api/types/list-folder';
import { BaseDialogRequest } from '../../store/dialogs/dialogs.state';

export class CopyItemsDialogRequest implements BaseDialogRequest {
  constructor(public item: ListFolderItem) {}
}
