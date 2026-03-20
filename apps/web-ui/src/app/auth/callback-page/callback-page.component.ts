import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, Subscription } from 'rxjs';

import { WINDOW } from '../../app.tokens';
import { authActions, authState } from '../store';

@Component({
  selector: 'app-callback-page',
  imports: [],
  templateUrl: './callback-page.component.html',
})
export class CallbackPageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly window = inject(WINDOW);

  private readonly subscription = new Subscription();

  readonly code$ = this.route.queryParamMap.pipe(
    map((params) => params.get('code')!),
  );

  ngOnInit(): void {
    this.subscription.add(
      this.code$.subscribe((code) => {
        this.store.dispatch(authActions.loadAuth({ code }));
      }),
    );

    this.subscription.add(
      this.store
        .select(authState.selectAuthToken)
        .pipe(filter((accessToken) => accessToken.length > 0))
        .subscribe(() => {
          const redirectPath =
            this.window.localStorage.getItem('auth_redirect_path') ??
            '/albums/root';

          this.router.navigate([redirectPath]);
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
