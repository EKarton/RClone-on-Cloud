import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Map as ImmutableMap } from 'immutable';
import { of } from 'rxjs';

import { WINDOW } from '../../../app.tokens';
import { authState } from '../../store';
import { CallbackPageComponent } from '../callback-page.component';

describe('CallbackPageComponent', () => {
  let fixture: ComponentFixture<CallbackPageComponent>;
  let store: MockStore;
  let router: jasmine.SpyObj<Router>;
  let mockLocalStorageGetItem: jasmine.Spy;

  beforeEach(() => {
    mockLocalStorageGetItem = jasmine
      .createSpy('getItem')
      .and.returnValue(null);

    router = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [CallbackPageComponent],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(ImmutableMap().set('code', 'test-auth-code')),
          },
        },
        provideMockStore({
          selectors: [{ selector: authState.selectAuthToken, value: '' }],
        }),
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

    fixture = TestBed.createComponent(CallbackPageComponent);
    fixture.detectChanges();

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch');
  });

  it('should navigate to redirect path when auth token is available', () => {
    store.overrideSelector(authState.selectAuthToken, 'mockAccessToken');

    store.refreshState();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/albums/root']);
  });

  it('should navigate to custom redirect path if set in localStorage', () => {
    store.overrideSelector(authState.selectAuthToken, 'mockAccessToken');
    mockLocalStorageGetItem.and.returnValue('/custom/path');

    store.refreshState();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/custom/path']);
  });

  it('should not navigate if auth token is empty', () => {
    store.overrideSelector(authState.selectAuthToken, '');

    store.refreshState();
    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
