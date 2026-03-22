import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfViewerComponent } from '../pdf-viewer.component';

describe('PdfViewerComponent', () => {
  let fixture: ComponentFixture<PdfViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfViewerComponent],
    }).compileComponents();
  });

  it('should render an iframe with the sanitized blobUrl', () => {
    fixture = TestBed.createComponent(PdfViewerComponent);
    fixture.componentRef.setInput('blobUrl', 'blob:http://localhost/test-pdf');
    fixture.detectChanges();

    const iframe = fixture.nativeElement.querySelector('[data-testid="pdf-viewer"]');
    expect(iframe).toBeTruthy();
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.src).toContain('blob:http://localhost/test-pdf');
  });

  it('should update sanitizedUrl when blobUrl changes', () => {
    fixture = TestBed.createComponent(PdfViewerComponent);
    fixture.componentRef.setInput('blobUrl', 'blob:http://localhost/first');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.sanitizedUrl()).toBeTruthy();

    fixture.componentRef.setInput('blobUrl', 'blob:http://localhost/second');
    fixture.detectChanges();

    const iframe = fixture.nativeElement.querySelector('[data-testid="pdf-viewer"]');
    expect(iframe.src).toContain('blob:http://localhost/second');
  });
});
