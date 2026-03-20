import { Component, input, signal } from '@angular/core';

import { Reasoning } from '../../store/chats/chats.state';

@Component({
  selector: 'app-reasoning-collapse',
  templateUrl: './reasoning-collapse.component.html',
})
export class ReasoningCollapseComponent {
  readonly reasonings = input.required<Reasoning[]>();
  readonly isOpen = signal(false);

  toggle() {
    this.isOpen.set(!this.isOpen());
  }
}
