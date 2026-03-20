import { loadSavedTheme, setTheme, toggleTheme } from '../theme.actions';

describe('Theme Actions', () => {
  it('should create an action to load saved theme', () => {
    const action = loadSavedTheme();

    expect(action.type).toBe('[Theme] Load saved theme');
  });

  it('should create an action to toggle theme', () => {
    const action = toggleTheme();

    expect(action.type).toBe('[Theme] Toggle theme');
  });

  it('should create an action to set theme', () => {
    const isDark = true;

    const action = setTheme({ isDark });

    expect(action.type).toBe('[Theme] Set theme');
    expect(action.isDark).toBe(isDark);
  });
});
