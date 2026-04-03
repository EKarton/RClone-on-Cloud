import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { map } from 'rxjs/operators';

import { REMOTE_PATH$ } from '../folder-list-view.tokens';

@Component({
  standalone: true,
  selector: 'app-no-content-message',
  imports: [CommonModule],
  templateUrl: './no-content-message.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoContentMessageComponent {
  private readonly remotePath$ = inject(REMOTE_PATH$);

  readonly isAtRoot$ = this.remotePath$.pipe(map((remotePath) => !remotePath.path));
  readonly remoteName$ = this.remotePath$.pipe(map((remotePath) => remotePath.remote));
  readonly currentPath$ = this.remotePath$.pipe(map((remotePath) => remotePath.path));
}
