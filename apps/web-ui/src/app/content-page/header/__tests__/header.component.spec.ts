import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { List as ImmutableList } from 'immutable';

import { themeState } from '../../../themes/store';
import { routes } from '../../content-page.routes';
import { HeaderComponent } from '../header.component';
import { jobsState } from '../../store/jobs';
import { toPending } from '../../../shared/results/results';
import { UploadFileRequest } from '../../store/jobs/jobs.state';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let mockStore: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter(routes),
        provideMockStore({
          initialState: {
            [themeState.FEATURE_KEY]: themeState.initialState,
            [jobsState.FEATURE_KEY]: jobsState.initialState,
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    mockStore = TestBed.inject(MockStore);
  });

  it('should render component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the jobs icon when there are ongoing jobs', () => {
    mockStore.overrideSelector(
      jobsState.selectAllJobs,
      ImmutableList([
        {
          kind: 'upload-file',
          remote: 'remote',
          dirPath: 'dirPath',
          file: new File([], 'file.txt'),
          key: 'upload-file-1',
          result: toPending(),
        },
      ]),
    );
    mockStore.refreshState();
    fixture.detectChanges();

    const jobsIcon = fixture.nativeElement.querySelector('app-jobs-dropdown');
    expect(jobsIcon).toBeTruthy();
  });
});
