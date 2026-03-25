import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { ThemeToggleButtonComponent } from '../../themes/components/theme-toggle-button/theme-toggle-button.component';
import { UploadsDropdownComponent } from './uploads-dropdown/uploads-dropdown.component';
import { Store } from '@ngrx/store';
import { jobsState } from '../store/jobs';

@Component({
  standalone: true,
  selector: 'app-content-header',
  imports: [CommonModule, ThemeToggleButtonComponent, UploadsDropdownComponent],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  private readonly store = inject(Store);

  readonly jobs$ = this.store.select(jobsState.selectAllJobs);
}
