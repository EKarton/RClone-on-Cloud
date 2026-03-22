import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { REMOTE_PATH$ } from '../../folder-list-view.tokens';
import { FolderBreadcrumbsComponent } from '../folder-breadcrumbs.component';

describe('FolderBreadcrumbsComponent', () => {
  it('should render component when remote path has nested path', async () => {
    await TestBed.configureTestingModule({
      imports: [FolderBreadcrumbsComponent],
      providers: [
        provideRouter([]),
        {
          provide: REMOTE_PATH$,
          useValue: of({ remote: 'remote1', path: 'path1/path2/path3' }),
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(FolderBreadcrumbsComponent);
    fixture.detectChanges();

    // Assert component renders
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();

    // Assert component has the right text
    const links: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));
    expect(links.length).toEqual(4);
    expect(links[0].textContent).toEqual('Home');
    expect(links[1].textContent).toEqual('remote1');
    expect(links[2].textContent).toEqual('path1');
    expect(links[3].textContent).toEqual('path2');
    expect(
      fixture.nativeElement.querySelector('[data-testid="breadcrumb-text"]').textContent,
    ).toEqual('path3');
  });

  it('should render component correctly when remote path is not present', async () => {
    await TestBed.configureTestingModule({
      imports: [FolderBreadcrumbsComponent],
      providers: [
        provideRouter([]),
        {
          provide: REMOTE_PATH$,
          useValue: of({ remote: 'remote1' }),
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(FolderBreadcrumbsComponent);
    fixture.detectChanges();

    // Assert component renders
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();

    // Assert component has the right text
    const links: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));
    expect(links.length).toEqual(1);
    expect(links[0].textContent).toEqual('Home');
    expect(
      fixture.nativeElement.querySelector('[data-testid="breadcrumb-text"]').textContent,
    ).toEqual('remote1');
  });

  it('should render component correctly when path is not nested', async () => {
    await TestBed.configureTestingModule({
      imports: [FolderBreadcrumbsComponent],
      providers: [
        provideRouter([]),
        {
          provide: REMOTE_PATH$,
          useValue: of({ remote: 'remote1', path: 'path1' }),
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(FolderBreadcrumbsComponent);
    fixture.detectChanges();

    // Assert component renders
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();

    // Assert component has the right text
    const links: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));
    expect(links.length).toEqual(2);
    expect(links[0].textContent).toEqual('Home');
    expect(links[1].textContent).toEqual('remote1');
    expect(
      fixture.nativeElement.querySelector('[data-testid="breadcrumb-text"]').textContent,
    ).toEqual('path1');
  });
});
