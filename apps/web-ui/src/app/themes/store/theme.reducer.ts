import { createFeature, createReducer, on } from '@ngrx/store';

import * as themeActions from './theme.actions';
import { FEATURE_KEY, initialState, ThemeState } from './theme.state';

/** The theme reducer */
export const themeReducer = createReducer(
  initialState,
  on(
    themeActions.toggleTheme,
    (state): ThemeState => ({
      ...state,
      isDarkMode: !state.isDarkMode,
    }),
  ),

  on(
    themeActions.setTheme,
    (state, { isDark }): ThemeState => ({
      ...state,
      isDarkMode: isDark,
    }),
  ),
);

export const themeFeature = createFeature({
  name: FEATURE_KEY,
  reducer: themeReducer,
});
