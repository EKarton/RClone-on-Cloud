import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ThemeToggleButtonComponent } from '../../themes/components/theme-toggle-button/theme-toggle-button.component';
import { AvatarButtonComponent } from './avatar-button/avatar-button.component';

@Component({
  standalone: true,
  selector: 'app-content-header',
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleButtonComponent,
    AvatarButtonComponent,
  ],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit {
  readonly isSidebarOpen = signal(false);

  ngOnInit() {}

  openSideBar() {
    this.isSidebarOpen.set(true);
  }

  closeSideBar() {
    this.isSidebarOpen.set(false);
  }
}
