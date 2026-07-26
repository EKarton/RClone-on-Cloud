import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-pdf-viewer',
  templateUrl: 'pdf-viewer.component.html',
})
export class PdfViewerComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly blobUrl = input.required<string>();

  readonly sanitizedUrl: () => SafeResourceUrl = computed(() => {
    const url = this.blobUrl();
    if (!url.startsWith('blob:')) {
      throw new Error('Invalid blob URL: must start with "blob:"');
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
}
