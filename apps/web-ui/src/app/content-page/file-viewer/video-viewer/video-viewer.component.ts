import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-video-viewer',
  templateUrl: './video-viewer.component.html',
})
export class VideoViewerComponent {
  readonly blobUrl = input.required<string>();
}
