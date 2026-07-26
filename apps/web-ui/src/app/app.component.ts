import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie-service';

import { themeActions } from './themes/store';
import { AppUpdateService } from './pwa/services/app-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  providers: [CookieService],
})
export class AppComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly appUpdateService = inject(AppUpdateService);

  ngOnInit(): void {
    this.store.dispatch(themeActions.loadSavedTheme());
    this.appUpdateService.initialize();
  }
}
