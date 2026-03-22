import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject, of } from 'rxjs';
import { Mock, Mocked, vi } from 'vitest';

import { WINDOW } from '../../../app.tokens';
import { toFailure, toSuccess } from '../../../shared/results/results';
import { TokenResponse, WebApiService } from '../../services/webapi.service';
import { authActions } from '../../store';
import { CallbackPageComponent } from '../callback-page.component';

describe('CallbackPageComponent', () => {
  let fixture: ComponentFixture<CallbackPageComponent>;
  let store: MockStore;
  let router: Mocked<Router>;
  let webApiService: Mocked<WebApiService>;
  let mockLocalStorageGetItem: Mock;
  let queryParamMapSubject: BehaviorSubject<ParamMap>;
  let cookieService: CookieService;

  beforeEach(() => {
    mockLocalStorageGetItem = vi.fn().mockReturnValue(null);

    queryParamMapSubject = new BehaviorSubject<ParamMap>(
      convertToParamMap({ code: 'test-auth-code', state: 'valid-state' }),
    );

    router = { navigate: vi.fn() } as unknown as Mocked<Router>;
    webApiService = {
      fetchAccessToken: vi.fn(),
    } as unknown as Mocked<WebApiService>;

    TestBed.configureTestingModule({
      imports: [CallbackPageComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: WebApiService, useValue: webApiService },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMapSubject.asObservable(),
          },
        },
        provideMockStore(),
        {
          provide: WINDOW,
          useValue: {
            localStorage: {
              getItem: mockLocalStorageGetItem,
            },
          },
        },
        CookieService,
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(CallbackPageComponent);

    cookieService = TestBed.inject(CookieService);
    vi.spyOn(cookieService, 'delete');
  });

  afterEach(() => {
    cookieService.deleteAll();
  });

  it('should fetch token and navigate to redirect path on success', () => {
    const mockToken = 'mockToken';
    webApiService.fetchAccessToken.mockReturnValue(of(toSuccess({ token: mockToken })));

    cookieService.set('oauth_state', 'valid-state');

    fixture.detectChanges(); // Trigger ngOnInit

    expect(webApiService.fetchAccessToken).toHaveBeenCalledWith('test-auth-code');
    expect(store.dispatch).toHaveBeenCalledWith(authActions.setAuthToken({ authToken: mockToken }));
    expect(cookieService.delete).toHaveBeenCalledWith('oauth_state');
    expect(router.navigate).toHaveBeenCalledWith(['/remotes']);
  });

  it('should navigate to custom redirect path if set in localStorage', () => {
    const mockToken = 'mockToken';
    webApiService.fetchAccessToken.mockReturnValue(of(toSuccess({ token: mockToken })));
    cookieService.set('oauth_state', 'valid-state');
    mockLocalStorageGetItem.mockImplementation((key: string) => {
      if (key === 'auth_redirect_path') {
        return '/custom/path';
      }
      return null;
    });

    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/custom/path']);
  });

  it('should not navigate or dispatch if token fetch has failed', () => {
    webApiService.fetchAccessToken.mockReturnValue(
      of(toFailure<TokenResponse>(new Error('error'))),
    );
    cookieService.set('oauth_state', 'valid-state');

    fixture.detectChanges();

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect back to home if state parameter is missing', () => {
    cookieService.set('oauth_state', 'valid-state');
    queryParamMapSubject.next(convertToParamMap({ code: 'test-auth-code' }));
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(webApiService.fetchAccessToken).not.toHaveBeenCalled();
  });

  it('should redirect back to home if state parameter does not match stored state', () => {
    queryParamMapSubject.next(
      convertToParamMap({ code: 'test-auth-code', state: 'invalid-state' }),
    );
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(webApiService.fetchAccessToken).not.toHaveBeenCalled();
  });
});
