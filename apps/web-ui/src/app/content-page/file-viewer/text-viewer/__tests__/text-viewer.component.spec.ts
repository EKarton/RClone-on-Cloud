import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextViewerComponent } from '../text-viewer.component';

describe('TextViewerComponent', () => {
  let fixture: ComponentFixture<TextViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextViewerComponent],
    }).compileComponents();
  });

  it('should show loading spinner initially', () => {
    fixture = TestBed.createComponent(TextViewerComponent);
    const blob = new Blob(['Hello World'], { type: 'text/plain' });
    fixture.componentRef.setInput('blob', blob);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.loading-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should display text content after blob is read', async () => {
    fixture = TestBed.createComponent(TextViewerComponent);
    const blob = new Blob(['Hello World'], { type: 'text/plain' });
    fixture.componentRef.setInput('blob', blob);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 10));
    fixture.detectChanges();

    const pre = fixture.nativeElement.querySelector(
      '[data-testid="text-viewer"]',
    );
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain('Hello World');
  });
});
