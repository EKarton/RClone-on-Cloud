import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, Subscription, switchMap } from 'rxjs';

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

  private readonly subscription = new Subscription();

  readonly code$ = this.route.queryParamMap.pipe(
    map((params) => params.get('code')!),
  );

  readonly authTokenResult$ = this.code$.pipe(
    switchMap((code) => this.webApiService.fetchAccessToken(code)),
  );

  ngOnInit(): void {
    this.subscription.add(
      this.authTokenResult$.pipe(filterOnlySuccess()).subscribe(({ token }) => {
        this.store.dispatch(authActions.setAuthToken({ authToken: token }));
        const redirectPath =
          this.window.localStorage.getItem('auth_redirect_path') ?? '/remotes';

        this.router.navigate([redirectPath]);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
