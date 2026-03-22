import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-image-viewer',
  templateUrl: 'image-viewer.component.html',
})
export class ImageViewerComponent {
  readonly blobUrl = input.required<string>();
}
