import { CommonModule } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { NgClickOutsideDirective } from 'ng-click-outside2';

import { WINDOW } from '../../../app.tokens';
import { authState } from '../../../auth/store';

type DropdownPosition = 'left' | 'right';

@Component({
  standalone: true,
  selector: 'app-header-avatar-button',
  imports: [CommonModule, NgClickOutsideDirective],
  templateUrl: './avatar-button.component.html',
})
export class AvatarButtonComponent {
  readonly dropdownPosition = input<DropdownPosition>('right');

  private readonly store = inject(Store);
  private readonly window = inject(WINDOW);

  readonly isDropdownVisible = signal(false);
  readonly profileUrl = this.store.selectSignal(authState.selectUserProfileUrl);

  toggleDropdown() {
    this.isDropdownVisible.set(!this.isDropdownVisible());
  }

  closeDropdown() {
    this.isDropdownVisible.set(false);
  }

  signOut() {
    this.window.localStorage.removeItem('auth_redirect_path');
    this.window.location.href = '#';
    this.isDropdownVisible.set(false);
  }
}
