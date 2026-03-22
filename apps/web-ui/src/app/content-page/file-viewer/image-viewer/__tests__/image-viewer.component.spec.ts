import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageViewerComponent } from '../image-viewer.component';

describe('ImageViewerComponent', () => {
  let fixture: ComponentFixture<ImageViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageViewerComponent],
    }).compileComponents();
  });

  it('should render an img element with the provided blobUrl', () => {
    fixture = TestBed.createComponent(ImageViewerComponent);
    fixture.componentRef.setInput('blobUrl', 'blob:http://localhost/test-image');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('[data-testid="image-viewer"]');
    expect(img).toBeTruthy();
    expect(img.src).toBe('blob:http://localhost/test-image');
    expect(img.alt).toBe('File preview');
  });

  it('should update when blobUrl changes', () => {
    fixture = TestBed.createComponent(ImageViewerComponent);
    fixture.componentRef.setInput('blobUrl', 'blob:http://localhost/first');
    fixture.detectChanges();

    fixture.componentRef.setInput('blobUrl', 'blob:http://localhost/second');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('[data-testid="image-viewer"]');
    expect(img.src).toBe('blob:http://localhost/second');
  });
});
