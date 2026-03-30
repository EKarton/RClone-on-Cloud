import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Mock, vi } from 'vitest';

import { WINDOW } from '../../app.tokens';
import { themeState } from '../../themes/store';
import { HomePageComponent } from '../home-page.component';
import { provideRouter, Router } from '@angular/router';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;
  let mockWindow: {
    localStorage: { removeItem: Mock; setItem: Mock };
    pageYOffset: number;
    location: { href: string; pathname: string };
  };
  let router: Router;

  beforeEach(async () => {
    mockWindow = {
      location: { href: '', pathname: '' },
      pageYOffset: 0,
      localStorage: {
        removeItem: vi.fn(),
        setItem: vi.fn(),
      },
    };

    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        {
          provide: WINDOW,
          useValue: mockWindow,
        },
        provideRouter([]),
        provideMockStore({
          initialState: {
            [themeState.FEATURE_KEY]: themeState.initialState,
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should have no shadow and bg-base-300 initially', () => {
    const header: HTMLElement = fixture.nativeElement.querySelector('header');

    expect(header.classList.contains('shadow-none')).toBe(true);
    expect(header.classList.contains('bg-base-300')).toBe(true);
    expect(header.classList.contains('shadow-md')).toBe(false);
    expect(header.classList.contains('bg-base-200')).toBe(false);
  });

  it('should add shadow and bg-base-200 when scrolled', () => {
    const header: HTMLElement = fixture.nativeElement.querySelector('header');

    // Simulate scroll down
    Object.defineProperty(mockWindow, 'pageYOffset', {
      configurable: true,
      get: () => 100,
    });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(header.classList.contains('shadow-md')).toBe(true);
    expect(header.classList.contains('bg-base-200')).toBe(true);
    expect(header.classList.contains('shadow-none')).toBe(false);
    expect(header.classList.contains('bg-base-300')).toBe(false);
  });

  it('should remove shadow and revert to bg-base-300 when scroll is at top', () => {
    const header: HTMLElement = fixture.nativeElement.querySelector('header');

    // Scroll down first
    Object.defineProperty(mockWindow, 'pageYOffset', {
      configurable: true,
      get: () => 100,
    });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    // Scroll back to top
    Object.defineProperty(mockWindow, 'pageYOffset', {
      configurable: true,
      get: () => 0,
    });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(header.classList.contains('shadow-none')).toBe(true);
    expect(header.classList.contains('bg-base-300')).toBe(true);
    expect(header.classList.contains('shadow-md')).toBe(false);
    expect(header.classList.contains('bg-base-200')).toBe(false);
  });

  it('should clear auth redirect local storage and redirect to login URL on login click', () => {
    const button = fixture.nativeElement.querySelector('[data-test-id="login-button"]');
    button.click();

    expect(router.navigate).toHaveBeenCalledWith(['/auth/v1/google/login']);
    expect(mockWindow.localStorage.removeItem).toHaveBeenCalledWith('auth_redirect_path');
  });
});
