import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval, Subscription } from 'rxjs';

import { WINDOW } from '../../app.tokens';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly window = inject(WINDOW);

  readonly updateAvailable = signal(false);
  readonly unrecoverableError = signal(false);

  private readonly subscriptions = new Subscription();

  initialize(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.checkForUpdate();

    interval(60 * 60 * 1000).subscribe(() => {
      this.swUpdate.checkForUpdate();
    });

    this.subscriptions.add(
      this.swUpdate.versionUpdates
        .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
        .subscribe(() => {
          this.updateAvailable.set(true);
        }),
    );

    this.subscriptions.add(
      this.swUpdate.unrecoverable.subscribe((event) => {
        console.error('Unrecoverable service-worker state:', event.reason);
        this.unrecoverableError.set(true);
      }),
    );
  }

  reload(): void {
    this.window.location.reload();
  }

  shutdown() {
    this.subscriptions.unsubscribe();
  }
}
