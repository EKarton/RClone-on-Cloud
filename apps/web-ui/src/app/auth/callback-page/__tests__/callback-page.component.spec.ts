import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Map as ImmutableMap } from 'immutable';
import { of } from 'rxjs';

import { WINDOW } from '../../../app.tokens';
import { toFailure, toSuccess } from '../../../shared/results/results';
import { TokenResponse, WebApiService } from '../../services/webapi.service';
import { authActions } from '../../store';
import { CallbackPageComponent } from '../callback-page.component';

describe('CallbackPageComponent', () => {
  let fixture: ComponentFixture<CallbackPageComponent>;
  let store: MockStore;
  let router: jasmine.SpyObj<Router>;
  let webApiService: jasmine.SpyObj<WebApiService>;
  let mockLocalStorageGetItem: jasmine.Spy;

  beforeEach(() => {
    mockLocalStorageGetItem = jasmine
      .createSpy('getItem')
      .and.returnValue(null);

    router = jasmine.createSpyObj('Router', ['navigate']);
    webApiService = jasmine.createSpyObj('WebApiService', ['fetchAccessToken']);

    TestBed.configureTestingModule({
      imports: [CallbackPageComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: WebApiService, useValue: webApiService },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(ImmutableMap().set('code', 'test-auth-code')),
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
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(CallbackPageComponent);
  });

  it('should fetch token and navigate to redirect path on success', () => {
    const mockToken = 'mockToken';
    webApiService.fetchAccessToken.and.returnValue(
      of(toSuccess({ token: mockToken })),
    );

    fixture.detectChanges(); // Trigger ngOnInit

    expect(webApiService.fetchAccessToken).toHaveBeenCalledWith(
      'test-auth-code',
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      authActions.setAuthToken({ authToken: mockToken }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/remotes']);
  });

  it('should navigate to custom redirect path if set in localStorage', () => {
    const mockToken = 'mockToken';
    webApiService.fetchAccessToken.and.returnValue(
      of(toSuccess({ token: mockToken })),
    );
    mockLocalStorageGetItem.and.returnValue('/custom/path');

    fixture.detectChanges(); // Trigger ngOnInit

    expect(router.navigate).toHaveBeenCalledWith(['/custom/path']);
  });

  it('should not navigate or dispatch if token fetch has failed', () => {
    webApiService.fetchAccessToken.and.returnValue(
      of(toFailure<TokenResponse>(new Error('error'))),
    );

    fixture.detectChanges(); // Trigger ngOnInit

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
