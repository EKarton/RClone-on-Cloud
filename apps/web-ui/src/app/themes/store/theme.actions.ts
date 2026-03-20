import { createAction, props } from '@ngrx/store';

/** An action that loads the saved theme from local storage. */
export const loadSavedTheme = createAction('[Theme] Load saved theme');

/** An action that changes the theme to the next theme. */
export const toggleTheme = createAction('[Theme] Toggle theme');

/** An action that changes the theme to a set theme. */
export const setTheme = createAction(
  '[Theme] Set theme',
  props<{ isDark: boolean }>(),
);
