import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie-service';
import { filter, map, shareReplay, Subscription, switchMap } from 'rxjs';

import { WINDOW } from '../../app.tokens';
import { HasFailedPipe } from '../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../shared/results/pipes/is-pending.pipe';
import { filterOnlySuccess } from '../../shared/results/rxjs/filterOnlySuccess';
import { WebApiService } from '../services/webapi.service';
import { authActions } from '../store';

@Component({
  selector: 'app-callback-page',
  templateUrl: './callback-page.component.html',
  imports: [CommonModule, IsPendingPipe, HasFailedPipe],
})
export class CallbackPageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly window = inject(WINDOW);
  private readonly webApiService = inject(WebApiService);
  private readonly cookieService = inject(CookieService);

  private readonly subscription = new Subscription();

  readonly authParams$ = this.route.queryParamMap.pipe(
    map((params) => ({
      code: params.get('code'),
      state: params.get('state'),
    })),
  );

  readonly authTokenResult$ = this.authParams$.pipe(
    filter(({ code, state }) => {
      const storedState = this.cookieService.get('oauth_state');

      if (!code || !state || state !== storedState) {
        this.router.navigate(['/']);
        return false;
      }
      this.cookieService.delete('oauth_state');
      return true;
    }),
    switchMap(({ code }) => this.webApiService.fetchAccessToken(code!)),
    shareReplay(1),
  );

  ngOnInit(): void {
    this.subscription.add(
      this.authTokenResult$.pipe(filterOnlySuccess()).subscribe(({ token }) => {
        this.store.dispatch(authActions.setAuthToken({ authToken: token }));
        const redirectPath = this.window.localStorage.getItem('auth_redirect_path') ?? '/remotes';

        this.router.navigate([redirectPath]);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
