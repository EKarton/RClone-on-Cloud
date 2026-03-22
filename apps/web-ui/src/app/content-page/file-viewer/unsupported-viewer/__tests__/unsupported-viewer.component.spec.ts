import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnsupportedViewerComponent } from '../unsupported-viewer.component';

describe('UnsupportedViewerComponent', () => {
  let fixture: ComponentFixture<UnsupportedViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnsupportedViewerComponent],
    }).compileComponents();
  });

  it('should show the unsupported message', () => {
    fixture = TestBed.createComponent(UnsupportedViewerComponent);
    fixture.componentRef.setInput('fileName', 'archive.zip');
    fixture.componentRef.setInput('blobUrl', 'blob:http://localhost/test');
    fixture.detectChanges();

    const message = fixture.nativeElement.querySelector(
      '[data-testid="unsupported-viewer"]',
    );
    expect(message).toBeTruthy();
    expect(message.textContent).toContain('This file type cannot be previewed');
  });

  it('should display the file name', () => {
    fixture = TestBed.createComponent(UnsupportedViewerComponent);
    fixture.componentRef.setInput('fileName', 'archive.zip');
    fixture.componentRef.setInput('blobUrl', 'blob:http://localhost/test');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('archive.zip');
  });

  it('should render a download link with correct attributes', () => {
    fixture = TestBed.createComponent(UnsupportedViewerComponent);
    fixture.componentRef.setInput('fileName', 'archive.zip');
    fixture.componentRef.setInput('blobUrl', 'blob:http://localhost/test-dl');
    fixture.detectChanges();

    const downloadLink = fixture.nativeElement.querySelector('a.btn');
    expect(downloadLink).toBeTruthy();
    expect(downloadLink.href).toBe('blob:http://localhost/test-dl');
    expect(downloadLink.download).toBe('archive.zip');
    expect(downloadLink.textContent).toContain('Download File');
  });
});
