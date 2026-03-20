import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { themeActions, themeState } from '../../store';

@Component({
  standalone: true,
  selector: 'app-theme-toggle-button',
  imports: [CommonModule],
  templateUrl: './theme-toggle-button.component.html',
})
export class ThemeToggleButtonComponent {
  private readonly store = inject(Store);

  readonly isDarkMode = this.store.selectSignal(themeState.selectIsDarkMode);

  toggleTheme() {
    this.store.dispatch(themeActions.toggleTheme());
  }
}
