import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';

import * as themeActions from '../theme.actions';
import { ThemeEffects } from '../theme.effects';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { themeState } from '..';

describe('ThemeEffects', () => {
  let actions$: Actions;
  let effects: ThemeEffects;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThemeEffects, provideMockActions(() => actions$), provideMockStore()],
    });

    effects = TestBed.inject(ThemeEffects);
    store = TestBed.inject(MockStore);
  });

  describe('loadSavedTheme$', () => {
    it('should load saved theme from localStorage and dispatch setTheme action', async () => {
      const savedTheme = 'dark';
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(savedTheme),
        setItem: vi.fn(),
      });
      const action = themeActions.loadSavedTheme();
      const expectedAction = themeActions.setTheme({ isDark: true });

      actions$ = of(action);

      const resultAction = await firstValueFrom(effects.loadSavedTheme$);
      expect(resultAction).toEqual(expectedAction);
    });

    it('should set saved theme to "light" if there is none from localStorage and dispatch setTheme action', async () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
      });
      const action = themeActions.loadSavedTheme();
      const expectedAction = themeActions.setTheme({ isDark: false });

      actions$ = of(action);

      const resultAction = await firstValueFrom(effects.loadSavedTheme$);
      expect(resultAction).toEqual(expectedAction);
    });
  });

  describe('applyTheme$', () => {
    it('should set dark theme in document and localStorage when isDark is true', async () => {
      const action = themeActions.setTheme({ isDark: true });
      actions$ = of(action);
      store.overrideSelector(themeState.selectIsDarkMode, true);

      const setAttributeSpy = vi.spyOn(document.documentElement, 'setAttribute');
      const setItemSpy = vi.fn();
      vi.stubGlobal('localStorage', {
        setItem: setItemSpy,
        getItem: vi.fn(),
      });

      await firstValueFrom(effects.applyTheme$);
      expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
      expect(setItemSpy).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should set light theme in document and localStorage when isDark is false', async () => {
      const action = themeActions.toggleTheme();
      actions$ = of(action);
      store.overrideSelector(themeState.selectIsDarkMode, false);

      const setAttributeSpy = vi.spyOn(document.documentElement, 'setAttribute');
      const setItemSpy = vi.fn();
      vi.stubGlobal('localStorage', {
        setItem: setItemSpy,
        getItem: vi.fn(),
      });

      await firstValueFrom(effects.applyTheme$);
      expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'light');
      expect(setItemSpy).toHaveBeenCalledWith('theme', 'light');
    });
  });
});
