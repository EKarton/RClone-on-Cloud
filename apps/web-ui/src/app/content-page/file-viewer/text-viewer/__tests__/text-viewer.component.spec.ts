import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

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

  it('should display text content after blob is read', fakeAsync(() => {
    fixture = TestBed.createComponent(TextViewerComponent);
    const blob = new Blob(['Hello World'], { type: 'text/plain' });
    fixture.componentRef.setInput('blob', blob);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const pre = fixture.nativeElement.querySelector(
      '[data-testid="text-viewer"]',
    );
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain('Hello World');
  }));

  it('should display multi-line text correctly', fakeAsync(() => {
    fixture = TestBed.createComponent(TextViewerComponent);
    const text = 'Line 1\nLine 2\nLine 3';
    const blob = new Blob([text], { type: 'text/plain' });
    fixture.componentRef.setInput('blob', blob);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const pre = fixture.nativeElement.querySelector(
      '[data-testid="text-viewer"]',
    );
    expect(pre.textContent).toContain('Line 1');
    expect(pre.textContent).toContain('Line 2');
    expect(pre.textContent).toContain('Line 3');
  }));
});
