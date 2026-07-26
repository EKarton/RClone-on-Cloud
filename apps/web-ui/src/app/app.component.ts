import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie-service';

import { themeActions } from './themes/store';
import { AppUpdateService } from './pwa/services/app-update.service';
import { PwaUpdateBannerComponent } from './pwa/pwa-update-banner/pwa-update-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaUpdateBannerComponent],
  templateUrl: './app.component.html',
  providers: [CookieService],
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly appUpdateService = inject(AppUpdateService);

  ngOnInit(): void {
    this.store.dispatch(themeActions.loadSavedTheme());
    this.appUpdateService.initialize();
  }

  ngOnDestroy(): void {
    this.appUpdateService.shutdown();
  }
}
