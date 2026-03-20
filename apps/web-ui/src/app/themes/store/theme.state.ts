import { createFeatureSelector, createSelector } from '@ngrx/store';

export interface ThemeState {
  isDarkMode: boolean;
}

/** The initial state of this state. */
export const initialState: ThemeState = {
  isDarkMode: false,
};

/** The feature key shared with the reducer. */
export const FEATURE_KEY = 'Theme';

export const selectThemeState = createFeatureSelector<ThemeState>(FEATURE_KEY);

export const selectIsDarkMode = createSelector(
  selectThemeState,
  (state) => state.isDarkMode,
);
