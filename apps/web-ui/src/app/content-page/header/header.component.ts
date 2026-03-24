import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { ThemeToggleButtonComponent } from '../../themes/components/theme-toggle-button/theme-toggle-button.component';
import { UploadsDropdownComponent } from './uploads-dropdown/uploads-dropdown.component';
import { Store } from '@ngrx/store';
import { fileUploadsState } from '../store/file-uploads';

@Component({
  standalone: true,
  selector: 'app-content-header',
  imports: [CommonModule, ThemeToggleButtonComponent, UploadsDropdownComponent],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  private readonly store = inject(Store);

  readonly uploadingFiles$ = this.store.select(fileUploadsState.selectAllUploadingFiles);
}
