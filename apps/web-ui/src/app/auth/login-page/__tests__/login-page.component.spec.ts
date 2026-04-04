import { TestBed } from '@angular/core/testing';
import { Mock, vi } from 'vitest';

import { WINDOW } from '../../../app.tokens';
import { LoginPageComponent } from '../login-page.component';
import { CookieService } from 'ngx-cookie-service';
import { environment } from '../../../../environments/environment';

describe('LoginPageComponent', () => {
  let mockWindow: {
    localStorage: { removeItem: Mock; setItem: Mock };
    pageYOffset: number;
    location: { href: string; pathname: string };
  };
  let cookieService: CookieService;

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
      imports: [LoginPageComponent],
      providers: [
        {
          provide: WINDOW,
          useValue: mockWindow,
        },
        CookieService,
      ],
    }).compileComponents();

    cookieService = TestBed.inject(CookieService);
    vi.spyOn(cookieService, 'set');
  });

  it('should redirect user to login URL with select_account=true and state set', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('123e4567-e89b-12d3-a456-426614174000');
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((arr) => {
      const typedArr = arr as Uint32Array;
      for (let i = 0; i < typedArr.length; i++) {
        typedArr[i] = 0;
      }
      return arr;
    });
    if (!crypto.subtle) {
      Object.defineProperty(crypto, 'subtle', { value: {} });
    }
    crypto.subtle.digest = vi.fn().mockResolvedValue(new ArrayBuffer(32));

    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    // Wait for async promises to settle
    await new Promise((resolve) => setTimeout(resolve, 0));

    // ArrayBuffer(32) filled with 0s base64url encoded:
    const mockChallenge = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    // 56 zeros in Uint32Array, transformed to hex '00' padding -> 112 zeros
    const mockVerifier = '00'.repeat(56);

    const expectedHref = `${environment.loginUrl}?select_account=true&state=123e4567-e89b-12d3-a456-426614174000&code_challenge_method=S256&challenge=${mockChallenge}`;
    expect(mockWindow.location.href).toBe(expectedHref);
    expect(cookieService.set).toHaveBeenCalledWith(
      'oauth_state',
      '123e4567-e89b-12d3-a456-426614174000',
      300,
      '/',
      undefined,
      true,
      'Lax',
    );
    expect(cookieService.set).toHaveBeenCalledWith(
      'oauth_verifier',
      mockVerifier,
      300,
      '/',
      undefined,
      true,
      'Lax',
    );
  });
});
