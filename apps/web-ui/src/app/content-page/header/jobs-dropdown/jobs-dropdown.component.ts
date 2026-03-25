import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { jobsState } from '../../store/jobs';
import { map } from 'rxjs/operators';
import { HasSucceededPipe } from '../../../shared/results/pipes/has-succeeded.pipe';
import { IsPendingPipe } from '../../../shared/results/pipes/is-pending.pipe';
import { isPending } from '../../../shared/results/results';

@Component({
  standalone: true,
  selector: 'app-jobs-dropdown',
  imports: [CommonModule, HasSucceededPipe, IsPendingPipe],
  templateUrl: './jobs-dropdown.component.html',
})
export class JobsDropdownComponent {
  private readonly store = inject(Store);

  readonly jobs$ = this.store.select(jobsState.selectAllJobs);

  readonly hasOngoingJobs$ = this.jobs$.pipe(
    map((jobs) => jobs.some((job) => isPending(job.result))),
  );
}
