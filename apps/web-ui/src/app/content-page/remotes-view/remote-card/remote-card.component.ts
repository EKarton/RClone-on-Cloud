import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { Buffer } from 'buffer';
import { switchMap } from 'rxjs';

import { PrettyBytesPipe } from '../../../shared/pipes/pretty-bytes.pipe';
import { HasFailedPipe } from '../../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../../shared/results/pipes/is-pending.pipe';
import { WebApiService } from '../../services/web-api/web-api.service';

@Component({
  standalone: true,
  selector: 'app-remote-card',
  imports: [
    CommonModule,
    RouterModule,
    HasFailedPipe,
    IsPendingPipe,
    PrettyBytesPipe,
  ],
  templateUrl: './remote-card.component.html',
})
export class RemoteCardComponent {
  readonly remote = input.required<string>();

  private readonly webApiService = inject(WebApiService);

  readonly foldersLink = computed(() => {
    return `/folders/${Buffer.from(`${this.remote()}:`).toString('base64').replace(/=/g, '')}`;
  });

  readonly usageResult$ = toObservable(this.remote).pipe(
    switchMap((remote) => this.webApiService.listRemoteUsage(remote)),
  );
}
