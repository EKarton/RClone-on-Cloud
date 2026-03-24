import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { fileUploadsState } from '../../store/file-uploads';
import { map } from 'rxjs/operators';
import { HasSucceededPipe } from '../../../shared/results/pipes/has-succeeded.pipe';
import { IsPendingPipe } from '../../../shared/results/pipes/is-pending.pipe';
import { isPending } from '../../../shared/results/results';

@Component({
  standalone: true,
  selector: 'app-uploads-dropdown',
  imports: [CommonModule, HasSucceededPipe, IsPendingPipe],
  templateUrl: './uploads-dropdown.component.html',
})
export class UploadsDropdownComponent {
  private readonly store = inject(Store);

  readonly uploadingFiles$ = this.store.select(fileUploadsState.selectAllUploadingFiles);

  readonly hasOngoingUploads$ = this.uploadingFiles$.pipe(
    map((files) => files.some((file) => isPending(file.result))),
  );
}
