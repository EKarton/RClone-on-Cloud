import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import { WINDOW } from '../app.tokens';
import { ThemeToggleButtonComponent } from '../themes/components/theme-toggle-button/theme-toggle-button.component';

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, ThemeToggleButtonComponent],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {
  private readonly window: Window = inject(WINDOW);

  readonly isScrolled = signal(false);

  @HostListener('window:scroll', [])
  onScroll() {
    this.isScrolled.set(this.window.pageYOffset > 50);
  }

  handleLoginClick() {
    this.window.localStorage.removeItem('auth_redirect_path');
    this.window.location.href = `${environment.loginUrl}?select_account=true`;
  }
}
