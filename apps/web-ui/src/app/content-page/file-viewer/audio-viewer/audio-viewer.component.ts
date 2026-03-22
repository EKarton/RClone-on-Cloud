import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-audio-viewer',
  templateUrl: 'audio-viewer.component.html',
})
export class AudioViewerComponent {
  readonly blobUrl = input.required<string>();
}
