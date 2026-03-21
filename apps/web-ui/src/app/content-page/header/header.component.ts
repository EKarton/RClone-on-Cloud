import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { ThemeToggleButtonComponent } from '../../themes/components/theme-toggle-button/theme-toggle-button.component';

@Component({
  standalone: true,
  selector: 'app-content-header',
  imports: [CommonModule, ThemeToggleButtonComponent],
  templateUrl: './header.component.html',
})
export class HeaderComponent {}
