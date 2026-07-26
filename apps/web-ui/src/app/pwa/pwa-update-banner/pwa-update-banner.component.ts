import { Component, inject } from '@angular/core';

import { AppUpdateService } from '../services/app-update.service';

@Component({
  selector: 'app-pwa-update-banner',
  templateUrl: './pwa-update-banner.component.html',
})
export class PwaUpdateBannerComponent {
  readonly appUpdateService = inject(AppUpdateService);
}
