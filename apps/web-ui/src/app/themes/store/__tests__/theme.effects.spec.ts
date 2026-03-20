import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import * as themeActions from '../theme.actions';
import { ThemeEffects } from '../theme.effects';

describe('ThemeEffects', () => {
  let actions$: Actions;
  let effects: ThemeEffects;
  let store: jasmine.SpyObj<Store>;

  beforeEach(() => {
    const storeSpy = jasmine.createSpyObj('Store', ['select']);

    TestBed.configureTestingModule({
      providers: [
        ThemeEffects,
        provideMockActions(() => actions$),
        { provide: Store, useValue: storeSpy },
      ],
    });

    effects = TestBed.inject(ThemeEffects);
    store = TestBed.inject(Store) as jasmine.SpyObj<Store>;
  });

  describe('loadSavedTheme$', () => {
    it('should load saved theme from localStorage and dispatch setTheme action', (done) => {
      const savedTheme = 'dark';
      spyOn(localStorage, 'getItem').and.returnValue(savedTheme);
      const action = themeActions.loadSavedTheme();
      const expectedAction = themeActions.setTheme({ isDark: true });

      actions$ = of(action);

      effects.loadSavedTheme$.subscribe((resultAction) => {
        expect(resultAction).toEqual(expectedAction);
        done();
      });
    });

    it('should set saved theme to "light" if there is none from localStorage and dispatch setTheme action', (done) => {
      const action = themeActions.loadSavedTheme();
      const expectedAction = themeActions.setTheme({ isDark: false });

      actions$ = of(action);

      effects.loadSavedTheme$.subscribe((resultAction) => {
        expect(resultAction).toEqual(expectedAction);
        done();
      });
    });
  });

  describe('applyTheme$', () => {
    it('should set dark theme in document and localStorage when isDark is true', (done) => {
      const action = themeActions.setTheme({ isDark: true });
      actions$ = of(action);
      store.select.and.returnValue(of(true));

      const setAttributeSpy = spyOn(document.documentElement, 'setAttribute');
      const setItemSpy = spyOn(localStorage, 'setItem');

      effects.applyTheme$.subscribe(() => {
        expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
        expect(setItemSpy).toHaveBeenCalledWith('theme', 'dark');
        done();
      });
    });

    it('should set light theme in document and localStorage when isDark is false', (done) => {
      const action = themeActions.toggleTheme();
      actions$ = of(action);
      store.select.and.returnValue(of(false));

      const setAttributeSpy = spyOn(document.documentElement, 'setAttribute');
      const setItemSpy = spyOn(localStorage, 'setItem');

      effects.applyTheme$.subscribe(() => {
        expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'light');
        expect(setItemSpy).toHaveBeenCalledWith('theme', 'light');
        done();
      });
    });
  });
});
