import { TestBed } from '@angular/core/testing';

import { Reasoning } from '../../../store/chats/chats.state';
import { ReasoningCollapseComponent } from '../reasoning-collapse.component';

const mockReasonings: Reasoning[] = [
  { id: '1', content: 'Reason 1' },
  { id: '2', content: 'Reason 2' },
];

describe('ReasoningCollapseComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReasoningCollapseComponent],
    }).compileComponents();
  });

  it('should show toggle button and be closed by default', () => {
    const fixture = TestBed.createComponent(ReasoningCollapseComponent);
    fixture.componentRef.setInput('reasonings', mockReasonings);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="toggle-button"]',
    );
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Show Reasoning');

    expect(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="reasoning-content"]',
      ).length,
    ).toBe(0);
  });

  it('should open and display reasonings after clicking toggle', () => {
    const fixture = TestBed.createComponent(ReasoningCollapseComponent);
    fixture.componentRef.setInput('reasonings', mockReasonings);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="toggle-button"]',
    );
    button.click();
    fixture.detectChanges();

    const paragraphs = fixture.nativeElement.querySelectorAll(
      '[data-testid="reasoning-content"]',
    );
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].textContent).toContain('Reason 1');
    expect(paragraphs[1].textContent).toContain('Reason 2');
  });

  it('should close again after clicking toggle twice', () => {
    const fixture = TestBed.createComponent(ReasoningCollapseComponent);
    fixture.componentRef.setInput('reasonings', mockReasonings);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="toggle-button"]',
    );
    button.click();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="reasoning-content"]',
      ).length,
    ).toBe(2);

    button.click();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="reasoning-content"]',
      ).length,
    ).toBe(0);
  });
});
