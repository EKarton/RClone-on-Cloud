import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoViewerComponent } from '../video-viewer.component';

describe('VideoViewerComponent', () => {
  let fixture: ComponentFixture<VideoViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoViewerComponent],
    }).compileComponents();
  });

  it('should render a video element with the provided blobUrl', () => {
    fixture = TestBed.createComponent(VideoViewerComponent);
    fixture.componentRef.setInput(
      'blobUrl',
      'blob:http://localhost/test-video',
    );
    fixture.detectChanges();

    const video = fixture.nativeElement.querySelector(
      '[data-testid="video-viewer"]',
    );
    expect(video).toBeTruthy();
    expect(video.src).toBe('blob:http://localhost/test-video');
    expect(video.controls).toBeTrue();
  });
});
