import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-unsupported-viewer',
  templateUrl: './unsupported-viewer.component.html',
})
export class UnsupportedViewerComponent {
  readonly fileName = input.required<string>();
  readonly blobUrl = input.required<string>();
}
