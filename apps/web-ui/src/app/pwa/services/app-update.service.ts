import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval } from 'rxjs';

import { WINDOW } from '../../app.tokens';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly window = inject(WINDOW);

  initialize() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.checkForUpdate();

    interval(60 * 60 * 1000).subscribe(() => {
      this.swUpdate.checkForUpdate();
    });

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        const updateNow = this.window.confirm(
          'A new version of RClone on Cloud is available. Reload now?',
        );

        if (updateNow) {
          this.window.location.reload();
        }
      });

    this.swUpdate.unrecoverable.subscribe((event) => {
      console.error('Unrecoverable service-worker state:', event.reason);

      this.window.alert('RClone on Cloud needs to reload because an update could not be applied.');

      this.window.location.reload();
    });
  }
}
