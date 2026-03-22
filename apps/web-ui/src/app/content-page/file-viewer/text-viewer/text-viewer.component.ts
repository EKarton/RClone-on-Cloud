import { Component, effect, input, signal } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-text-viewer',
  templateUrl: 'text-viewer.component.html',
})
export class TextViewerComponent {
  readonly blob = input.required<Blob>();
  readonly textContent = signal<string | null>(null);

  constructor() {
    effect(() => {
      const blob = this.blob();
      blob.text().then((text) => this.textContent.set(text));
    });
  }
}
