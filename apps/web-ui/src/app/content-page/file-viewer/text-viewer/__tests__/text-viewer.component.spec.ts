import { TestBed } from '@angular/core/testing';

import { TextViewerComponent } from '../text-viewer.component';

describe('TextViewerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextViewerComponent],
    }).compileComponents();
  });

  it('should show loading spinner initially', () => {
    const fixture = TestBed.createComponent(TextViewerComponent);
    const blob = new Blob(['Hello World'], { type: 'text/plain' });
    fixture.componentRef.setInput('blob', blob);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.loading-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should display text content after blob is read', async () => {
    const fixture = TestBed.createComponent(TextViewerComponent);
    const blob = new Blob(['Hello World'], { type: 'text/plain' });
    spyOn(blob, 'text').and.returnValue(Promise.resolve('Hello World'));
    fixture.componentRef.setInput('blob', blob);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const pre = fixture.nativeElement.querySelector(
      '[data-testid="text-viewer"]',
    );
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain('Hello World');
  });
});
