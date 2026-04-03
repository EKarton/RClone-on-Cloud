import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { REMOTE_PATH$ } from '../../folder-list-view.tokens';
import { NoContentMessageComponent } from '../no-content-message.component';

describe('NoContentMessageComponent', () => {
  let fixture: ComponentFixture<NoContentMessageComponent>;
  let remotePathSubject: BehaviorSubject<{ remote: string; path: string }>;

  beforeEach(async () => {
    remotePathSubject = new BehaviorSubject({
      remote: 'my-remote',
      path: 'my-path',
    });

    await TestBed.configureTestingModule({
      imports: [NoContentMessageComponent],
      providers: [{ provide: REMOTE_PATH$, useValue: remotePathSubject }],
    }).compileComponents();

    fixture = TestBed.createComponent(NoContentMessageComponent);
  });

  it('should render no content in remotes card when path is at root', () => {
    remotePathSubject.next({ remote: 'my-remote', path: '' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="no-items-at-root"]')).toBeTruthy();
  });

  it('should render no items in folder when path is not at root', () => {
    remotePathSubject.next({ remote: 'my-remote', path: 'my-path' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="no-items-in-folder"]')).toBeTruthy();
  });
});
