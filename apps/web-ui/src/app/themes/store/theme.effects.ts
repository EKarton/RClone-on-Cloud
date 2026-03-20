import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { map, tap } from 'rxjs/operators';

import * as themeActions from './theme.actions';
import { selectIsDarkMode } from './theme.state';

@Injectable()
export class ThemeEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  loadSavedTheme$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(themeActions.loadSavedTheme),
      map(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        return themeActions.setTheme({ isDark: savedTheme === 'dark' });
      }),
    );
  });

  applyTheme$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(themeActions.setTheme, themeActions.toggleTheme),
        concatLatestFrom(() => this.store.select(selectIsDarkMode)),
        tap(([, isDark]) => {
          if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('class', 'dark');
            localStorage.setItem('theme', 'dark');
          } else {
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('class', 'light');
            localStorage.setItem('theme', 'light');
          }
        }),
      );
    },
    { dispatch: false },
  );
}
