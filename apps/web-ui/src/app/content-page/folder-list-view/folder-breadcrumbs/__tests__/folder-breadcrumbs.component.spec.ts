import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { FolderBreadcrumbsComponent } from '../folder-breadcrumbs.component';
import { REMOTE_PATH$ } from '../../folder-list-view.tokens';
import { provideRouter } from '@angular/router';

describe('FolderBreadcrumbsComponent', () => {
  let fixture: ComponentFixture<FolderBreadcrumbsComponent>;
  let remotePath$: BehaviorSubject<{ remote: string; path?: string }>;

  beforeEach(async () => {
    remotePath$ = new BehaviorSubject<{ remote: string; path?: string }>({
      remote: 'my-remote',
      path: 'folder1/folder2/current',
    });

    await TestBed.configureTestingModule({
      imports: [FolderBreadcrumbsComponent],
      providers: [
        provideRouter([]),
        {
          provide: REMOTE_PATH$,
          useValue: remotePath$.asObservable(),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FolderBreadcrumbsComponent);
    fixture.detectChanges();
  });

  it('should render Home breadcrumb as a link', () => {
    expect(getBreadcrumbLinkByText('Home')).toBeTruthy();
    expect(getBreadcrumbLinkByText('Home')?.getAttribute('href')).toContain('/remotes');
  });

  it('should render remote breadcrumb as a link when path has folders', () => {
    const remoteLink = getBreadcrumbLinkByText('my-remote');

    expect(remoteLink).toBeTruthy();
    expect(remoteLink?.getAttribute('href')).toContain(
      `/folders/${encodeFolderPath('my-remote:')}`,
    );
  });

  it('should render intermediate folders as links', () => {
    const folder1Link = getBreadcrumbLinkByText('folder1');
    const folder2Link = getBreadcrumbLinkByText('folder2');

    expect(folder1Link).toBeTruthy();
    expect(folder1Link?.getAttribute('href')).toContain(
      `/folders/${encodeFolderPath('my-remote:folder1')}`,
    );

    expect(folder2Link).toBeTruthy();
    expect(folder2Link?.getAttribute('href')).toContain(
      `/folders/${encodeFolderPath('my-remote:folder1/folder2')}`,
    );
  });

  it('should render current folder as plain text', () => {
    expect(getBreadcrumbTextByText('current')).toBeTruthy();
    expect(getBreadcrumbLinkByText('current')).toBeFalsy();
  });

  it('should render only Home and remote when path is empty', () => {
    remotePath$.next({
      remote: 'my-remote',
      path: '',
    });
    fixture.detectChanges();

    const items = getBreadcrumbItems();

    expect(items.length).toBe(2);
    expect(items[0].textContent?.trim()).toBe('Home');
    expect(items[1].textContent?.trim()).toBe('my-remote');
  });

  it('should render only Home and remote when path is undefined', () => {
    remotePath$.next({
      remote: 'my-remote',
      path: undefined,
    });
    fixture.detectChanges();

    const items = getBreadcrumbItems();

    expect(items.length).toBe(2);
    expect(items[0].textContent?.trim()).toBe('Home');
    expect(items[1].textContent?.trim()).toBe('my-remote');
  });

  it('should render current folder correctly when path has only one folder', () => {
    remotePath$.next({
      remote: 'my-remote',
      path: 'documents',
    });
    fixture.detectChanges();

    expect(getBreadcrumbLinkByText('my-remote')).toBeTruthy();
    expect(getBreadcrumbTextByText('documents')).toBeTruthy();
    expect(getBreadcrumbLinkByText('documents')).toBeFalsy();
  });

  it('should update rendered breadcrumbs when remote path changes', () => {
    remotePath$.next({
      remote: 'another-remote',
      path: 'photos/2026',
    });
    fixture.detectChanges();

    expect(getBreadcrumbLinkByText('another-remote')).toBeTruthy();
    expect(getBreadcrumbLinkByText('another-remote')?.getAttribute('href')).toContain(
      `/folders/${encodeFolderPath('another-remote:')}`,
    );

    expect(getBreadcrumbLinkByText('photos')).toBeTruthy();
    expect(getBreadcrumbTextByText('2026')).toBeTruthy();
  });

  it('should scroll breadcrumb container to the end after breadcrumb items update', async () => {
    const container = getBreadcrumbContainer();

    Object.defineProperty(container, 'scrollWidth', {
      value: 500,
      configurable: true,
    });

    container.scrollLeft = 0;

    remotePath$.next({
      remote: 'my-remote',
      path: 'folder1/folder2/folder3',
    });
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.scrollLeft).toBe(500);
  });

  function getBreadcrumbContainer(): HTMLDivElement {
    return fixture.nativeElement.querySelector('.breadcrumbs') as HTMLDivElement;
  }

  function getBreadcrumbItems(): HTMLLIElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('li')) as HTMLLIElement[];
  }

  function getBreadcrumbLinks(): HTMLAnchorElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="breadcrumb-link"]'),
    ) as HTMLAnchorElement[];
  }

  function getBreadcrumbTexts(): HTMLSpanElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="breadcrumb-text"]'),
    ) as HTMLSpanElement[];
  }

  function getBreadcrumbLinkByText(text: string): HTMLAnchorElement | undefined {
    return getBreadcrumbLinks().find((el) => el.textContent?.trim() === text);
  }

  function getBreadcrumbTextByText(text: string): HTMLSpanElement | undefined {
    return getBreadcrumbTexts().find((el) => el.textContent?.trim() === text);
  }

  function encodeFolderPath(value: string): string {
    return btoa(value).replace(/=/g, '');
  }
});
