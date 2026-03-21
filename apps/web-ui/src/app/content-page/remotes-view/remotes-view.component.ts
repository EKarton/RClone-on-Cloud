import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { HasFailedPipe } from '../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../shared/results/pipes/is-pending.pipe';
import { WebApiService } from '../services/web-api/web-api.service';
import { RemoteCardComponent } from './remote-card/remote-card.component';

@Component({
  standalone: true,
  selector: 'app-remotes-view',
  imports: [CommonModule, HasFailedPipe, IsPendingPipe, RemoteCardComponent],
  templateUrl: './remotes-view.component.html',
})
export class RemotesViewComponent {
  private readonly webApiService = inject(WebApiService);

  readonly remotesResult$ = this.webApiService.listRemotes();
}
