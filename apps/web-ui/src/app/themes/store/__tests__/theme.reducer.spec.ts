import * as themeActions from '../theme.actions';
import { themeReducer } from '../theme.reducer';
import { initialState } from '../theme.state';

describe('Theme Reducer', () => {
  it('should toggle isDarkMode when toggleTheme action is dispatched', () => {
    const startingState = { isDarkMode: false };
    const action = themeActions.toggleTheme();

    const result = themeReducer(startingState, action);
    expect(result.isDarkMode).toBe(true);

    const nextAction = themeActions.toggleTheme();
    const nextResult = themeReducer(result, nextAction);
    expect(nextResult.isDarkMode).toBe(false);
  });

  it('should set isDarkMode to true when setTheme action is dispatched with true', () => {
    const action = themeActions.setTheme({ isDark: true });

    const result = themeReducer(initialState, action);

    expect(result.isDarkMode).toBe(true);
  });

  it('should set isDarkMode to false when setTheme action is dispatched with false', () => {
    const action = themeActions.setTheme({ isDark: false });

    const result = themeReducer(initialState, action);

    expect(result.isDarkMode).toBe(false);
  });
});
