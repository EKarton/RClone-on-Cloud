import { ListFolderItem } from '../../services/web-api/types/list-folder';
import { BaseDialogRequest } from '../../store/dialogs/dialogs.state';

export class MoveItemsDialogRequest implements BaseDialogRequest {
  constructor(public item: ListFolderItem) {}
}
