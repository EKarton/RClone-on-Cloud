import {
  initialState,
  selectIsDarkMode,
  selectThemeState,
  ThemeState,
} from '../theme.state';

describe('Theme Selectors', () => {
  describe('selectThemeState', () => {
    it('should select the theme state', () => {
      const result = selectThemeState.projector(initialState);

      expect(result).toEqual(initialState);
    });
  });

  describe('selectIsDarkMode', () => {
    it('should select isDarkMode from the theme state', () => {
      const state: ThemeState = { isDarkMode: true };

      const result = selectIsDarkMode.projector(state);

      expect(result).toBe(true);
    });

    it('should return false if isDarkMode is false', () => {
      const state: ThemeState = { isDarkMode: false };

      const result = selectIsDarkMode.projector(state);

      expect(result).toBe(false);
    });
  });
});
