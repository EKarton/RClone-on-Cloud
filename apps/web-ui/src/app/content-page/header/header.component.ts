import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, Subscription } from 'rxjs';

import { ThemeToggleButtonComponent } from '../../themes/components/theme-toggle-button/theme-toggle-button.component';
import { ChatDialogRequest } from '../chat-dialog/chat-dialog.request';
import { dialogsActions } from '../store/dialogs';
import { AvatarButtonComponent } from './avatar-button/avatar-button.component';

enum Tabs {
  ALBUMS = 'albums',
  PHOTOS = 'photos',
}

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
export class HeaderComponent implements OnInit, OnDestroy {
  readonly isSidebarOpen = signal(false);
  readonly selectedTab = signal(Tabs.ALBUMS);
  readonly Tabs = Tabs;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private store = inject(Store);

  private subscriptions = new Subscription();

  ngOnInit() {
    this.updateSelectedTab();
    this.subscriptions.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => {
          this.updateSelectedTab();
        }),
    );
  }

  private updateSelectedTab() {
    let child = this.route.firstChild;
    while (child?.firstChild) {
      child = child.firstChild;
    }

    const path = child?.snapshot.routeConfig?.path;

    if (path?.startsWith('albums/')) {
      this.selectedTab.set(Tabs.ALBUMS);
    } else if (path === 'photos') {
      this.selectedTab.set(Tabs.PHOTOS);
    }
  }

  openSideBar() {
    this.isSidebarOpen.set(true);
  }

  closeSideBar() {
    this.isSidebarOpen.set(false);
  }

  onSearchClick() {
    this.store.dispatch(
      dialogsActions.openDialog({
        request: new ChatDialogRequest(),
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
