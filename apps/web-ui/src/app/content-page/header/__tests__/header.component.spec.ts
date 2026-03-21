import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { themeState } from '../../../themes/store';
import { routes } from '../../content-page.routes';
import { HeaderComponent } from '../header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter(routes),
        provideMockStore({
          initialState: {
            [themeState.FEATURE_KEY]: themeState.initialState,
          },
        }),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render component', () => {
    expect(component).toBeTruthy();
  });
});
