import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { AppComponent } from '../app.component';
import { themeState } from '../themes/store';
import { AppUpdateService } from '../pwa/services/app-update.service';

describe('AppComponent', () => {
  const appUpdateServiceMock = {
    initialize: vi.fn(),
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

    expect(appUpdateServiceMock.initialize).toHaveBeenCalledOnce();
    expect(app).toBeTruthy();
  });
});
