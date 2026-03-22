import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { Buffer } from 'buffer';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { toFailure, toPending, toSuccess } from '../../../../shared/results/results';
import { FileViewerRequest } from '../../../file-viewer/file-viewer.request';
import { ListFolderResponse } from '../../../services/web-api/types/list-folder';
import { dialogsActions } from '../../../store/dialogs';
import { REMOTE_PATH$ } from '../../folder-list-view.tokens';
import { FolderListCardsComponent } from '../folder-list-cards.component';

describe('FolderListCardsComponent', () => {
  let fixture: ComponentFixture<FolderListCardsComponent>;
  let router: Router;
  let store: Store;
  let remotePathSubject: BehaviorSubject<{ remote: string; path: string }>;

  beforeEach(async () => {
    remotePathSubject = new BehaviorSubject({
      remote: 'my-remote',
      path: 'my-path',
    });

    await TestBed.configureTestingModule({
      imports: [FolderListCardsComponent],
      providers: [
        provideMockStore(),
        provideRouter([]),
        { provide: REMOTE_PATH$, useValue: remotePathSubject },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    store = TestBed.inject(Store);
    vi.spyOn(router, 'navigate');
    vi.spyOn(store, 'dispatch');

    fixture = TestBed.createComponent(FolderListCardsComponent);
  });

  it('should render skeleton when content results are loading', () => {
    fixture.componentRef.setInput('sortBy', 'name');
    fixture.componentRef.setInput('contentsResult', toPending());
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="item-skeleton"]')).toBeTruthy();
  });

  it('should render error when content results failed', () => {
    fixture.componentRef.setInput('sortBy', 'name');
    fixture.componentRef.setInput('contentsResult', toFailure(new Error('test')));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="item-error"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Error: test');
  });

  it('should render items correctly', () => {
    const mockFolderResponse: ListFolderResponse = {
      items: [
        {
          path: 'dir1',
          name: 'dir1',
          isDir: true,
          mimeType: 'inode/directory',
        },
        {
          path: 'file1.txt',
          name: 'file1.txt',
          isDir: false,
          mimeType: 'text/plain',
        },
      ],
    };

    fixture.componentRef.setInput('sortBy', 'name');
    fixture.componentRef.setInput('contentsResult', toSuccess(mockFolderResponse));
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="item"]');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('dir1');
    expect(items[1].textContent).toContain('file1.txt');
  });

  it('should navigate to nested folder on directory click', () => {
    const mockFolderResponse: ListFolderResponse = {
      items: [
        {
          path: 'dir1',
          name: 'dir1',
          isDir: true,
          mimeType: 'inode/directory',
        },
      ],
    };
    fixture.componentRef.setInput('sortBy', 'name');
    fixture.componentRef.setInput('contentsResult', toSuccess(mockFolderResponse));
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="item"]');
    items[0].click();

    const expectedBase64 = Buffer.from('my-remote:dir1').toString('base64').replace(/=/g, '');
    expect(router.navigate).toHaveBeenCalledWith(['/folders', expectedBase64]);
  });

  it('should dispatch FileViewerRequest on file click', () => {
    const mockFolderResponse: ListFolderResponse = {
      items: [
        {
          path: 'file1.txt',
          name: 'file1.txt',
          isDir: false,
          mimeType: 'text/plain',
        },
      ],
    };

    fixture.componentRef.setInput('sortBy', 'name');
    fixture.componentRef.setInput('contentsResult', toSuccess(mockFolderResponse));
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('[data-testid="item"]');
    items[0].click();

    const expectedRequest = new FileViewerRequest(
      'my-remote',
      'my-path',
      'file1.txt',
      'text/plain',
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      dialogsActions.openDialog({ request: expectedRequest }),
    );
  });
});
