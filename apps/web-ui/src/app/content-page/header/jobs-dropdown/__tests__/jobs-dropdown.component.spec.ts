import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { List as ImmutableList } from 'immutable';

import { JobsDropdownComponent } from '../jobs-dropdown.component';
import { jobsState } from '../../../store/jobs';
import { toPending, toSuccess } from '../../../../shared/results/results';

describe('JobsDropdownComponent', () => {
  let fixture: ComponentFixture<JobsDropdownComponent>;
  let mockStore: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobsDropdownComponent],
      providers: [
        provideRouter([]),
        provideMockStore({
          initialState: {
            [jobsState.FEATURE_KEY]: jobsState.initialState,
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JobsDropdownComponent);
    fixture.detectChanges();

    mockStore = TestBed.inject(MockStore);
  });

  it('should render component with a list of jobs present when user clicks on the jobs icon', () => {
    mockStore.overrideSelector(
      jobsState.selectAllJobs,
      ImmutableList([
        {
          kind: 'move-file',
          fromRemote: 'drive',
          fromPath: 'Documents',
          toRemote: 'photos',
          toPath: '2010',
          key: 'move-file-1',
          result: toPending(),
        },
        {
          kind: 'move-folder',
          fromRemote: 'drive',
          fromPath: 'Documents',
          toRemote: 'photos',
          toPath: '2010',
          key: 'move-folder-1',
          result: toSuccess(undefined),
        },
      ]),
    );
    mockStore.refreshState();
    fixture.detectChanges();

    const jobDetails = fixture.nativeElement.querySelector('[data-testid="job-details"]');
    expect(jobDetails.children.length).toBe(2);
    expect(jobDetails.children[0].textContent).toContain('Moving file Documents to 2010');
    expect(jobDetails.children[1].textContent).toContain('Moved folder Documents to 2010');
  });

  it('should render the spinner icon when there are ongoing jobs', () => {
    mockStore.overrideSelector(
      jobsState.selectAllJobs,
      ImmutableList([
        {
          kind: 'move-file',
          fromRemote: 'drive',
          fromPath: 'Documents',
          toRemote: 'photos',
          toPath: '2010',
          key: 'job1',
          result: toPending(),
        },
        {
          kind: 'move-folder',
          fromRemote: 'drive',
          fromPath: 'Documents',
          toRemote: 'photos',
          toPath: '2010',
          key: 'job2',
          result: toPending(),
        },
      ]),
    );
    mockStore.refreshState();
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.loading-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should not render the spinner icon when there are no ongoing jobs', () => {
    mockStore.overrideSelector(jobsState.selectAllJobs, ImmutableList([]));
    mockStore.refreshState();
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.loading-spinner');
    expect(spinner).toBeFalsy();
  });
});
