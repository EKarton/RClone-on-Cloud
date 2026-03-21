import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { HasFailedPipe } from '../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../shared/results/pipes/is-pending.pipe';
import { PrettyBytesPipe } from '../../../shared/pipes/pretty-bytes.pipe';
import { WebApiService } from '../../services/web-api/web-api.service';

@Component({
  standalone: true,
  selector: 'app-remote-card',
  imports: [CommonModule, HasFailedPipe, IsPendingPipe, PrettyBytesPipe],
  templateUrl: './remote-card.component.html',
})
export class RemoteCardComponent {
  readonly remote = input.required<string>();

  private readonly webApiService = inject(WebApiService);

  readonly usageResult$ = toObservable(this.remote).pipe(
    switchMap((remote) => this.webApiService.listRemoteUsage(remote)),
  );
}
