import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { HasFailedPipe } from '../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../shared/results/pipes/is-pending.pipe';
import { Result } from '../../shared/results/results';
import { ListRemotesResponse } from '../services/web-api/types/list-remotes';
import { WebApiService } from '../services/web-api/web-api.service';

@Component({
  standalone: true,
  selector: 'app-remotes-view',
  imports: [CommonModule, HasFailedPipe, IsPendingPipe],
  templateUrl: './remotes-view.component.html',
})
export class RemotesViewComponent implements OnInit {
  private readonly webApiService = inject(WebApiService);

  remotesResult$!: Observable<Result<ListRemotesResponse>>;

  ngOnInit() {
    this.remotesResult$ = this.webApiService.listRemotes();
  }
}
