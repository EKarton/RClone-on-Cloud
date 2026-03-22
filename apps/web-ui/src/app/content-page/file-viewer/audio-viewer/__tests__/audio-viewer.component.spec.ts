import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioViewerComponent } from '../audio-viewer.component';

describe('AudioViewerComponent', () => {
  let fixture: ComponentFixture<AudioViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AudioViewerComponent],
    }).compileComponents();
  });

  it('should render an audio element with the provided blobUrl', () => {
    fixture = TestBed.createComponent(AudioViewerComponent);
    fixture.componentRef.setInput(
      'blobUrl',
      'blob:http://localhost/test-audio',
    );
    fixture.detectChanges();

    const audio = fixture.nativeElement.querySelector(
      '[data-testid="audio-viewer"]',
    );
    expect(audio).toBeTruthy();
    expect(audio.src).toBe('blob:http://localhost/test-audio');
    expect(audio.controls).toBeTrue();
  });
});
