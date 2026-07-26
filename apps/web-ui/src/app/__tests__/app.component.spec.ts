import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { AppComponent } from '../app.component';
import { themeState } from '../themes/store';
import { AppUpdateService } from '../pwa/services/app-update.service';

describe('AppComponent', () => {
  const appUpdateServiceMock = {
    updateAvailable: vi.fn().mockReturnValue(false),
    unrecoverableError: vi.fn().mockReturnValue(false),
    initialize: vi.fn(),
    reload: vi.fn(),
    shutdown: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideMockStore({
          initialState: {
            [themeState.FEATURE_KEY]: themeState.initialState,
          },
        }),
        {
          provide: AppUpdateService,
          useValue: appUpdateServiceMock,
        },
      ],
    }).compileComponents();
  });

  it('should initializes PWA update handling and create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    expect(appUpdateServiceMock.initialize).toHaveBeenCalled();
    expect(app).toBeTruthy();
  });
});
