import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { themeState } from '../../../store';
import * as themeActions from '../../../store/theme.actions';
import { ThemeToggleButtonComponent } from '../theme-toggle-button.component';

describe('ThemeToggleButtonComponent', () => {
  let component: ThemeToggleButtonComponent;
  let fixture: ComponentFixture<ThemeToggleButtonComponent>;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ThemeToggleButtonComponent],
      providers: [
        provideMockStore({
          selectors: [{ selector: themeState.selectIsDarkMode, value: false }],
        }),
      ],
    });

    fixture = TestBed.createComponent(ThemeToggleButtonComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);

    spyOn(store, 'dispatch');
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch toggleTheme action when button is clicked', () => {
    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(store.dispatch).toHaveBeenCalledWith(themeActions.toggleTheme());
  });

  it('should display moon icon when isDarkMode is true', () => {
    store.overrideSelector(themeState.selectIsDarkMode, true);
    fixture.detectChanges();

    const moonIcon = fixture.nativeElement.querySelector('.moon-icon');
    expect(moonIcon).toBeTruthy();
  });

  it('should display sun icon when isDarkMode is false', () => {
    store.overrideSelector(themeState.selectIsDarkMode, false);
    fixture.detectChanges();

    const sunIcon = fixture.nativeElement.querySelector('.sun-icon');
    expect(sunIcon).toBeTruthy();
  });
});
