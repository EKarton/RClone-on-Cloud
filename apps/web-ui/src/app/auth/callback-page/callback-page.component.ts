import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, Subscription } from 'rxjs';
import { authActions, selectToken } from '../store';

@Component({
  selector: 'app-callback-page',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen bg-base-100">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-4 text-xl font-medium">Authenticating...</p>
    </div>
  `
})
export class CallbackPageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly subscription = new Subscription();

  readonly code$ = this.route.queryParamMap.pipe(
    map((params) => params.get('code')),
    filter((code) => code !== null),
    map(code => code as string)
  );

  ngOnInit(): void {
    this.subscription.add(
      this.code$.subscribe((code) => {
        this.store.dispatch(authActions.loadAuth({ code }));
      })
    );

    this.subscription.add(
      this.store.select(selectToken)
        .pipe(filter((token) => !!token))
        .subscribe(() => {
          this.router.navigate(['/contents']);
        })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
