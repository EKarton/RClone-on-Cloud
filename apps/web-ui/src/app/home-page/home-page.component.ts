import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';

import { WINDOW } from '../app.tokens';
import { ThemeToggleButtonComponent } from '../themes/components/theme-toggle-button/theme-toggle-button.component';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, RouterModule, ThemeToggleButtonComponent],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {
  readonly isScrolled = signal(false);
  private readonly window = inject(WINDOW);
  private readonly router = inject(Router);

  @HostListener('window:scroll', [])
  onScroll() {
    this.isScrolled.set(this.window.pageYOffset > 50);
  }

  login() {
    this.window.localStorage.removeItem('auth_redirect_path');
    this.router.navigate(['/auth/v1/google/login']);
  }
}
