import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterModule } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { Buffer } from 'buffer';
import { of } from 'rxjs';

import { toPending } from '../../../shared/results/results';
import { ListFolderResponse } from '../../services/web-api/types/list-folder';
import { WebApiService } from '../../services/web-api/web-api.service';
import { FolderListViewComponent } from '../folder-list-view.component';

describe('FolderListViewComponent', () => {
  let webApiServiceSpy: jasmine.SpyObj<WebApiService>;

  beforeEach(async () => {
    webApiServiceSpy = jasmine.createSpyObj('WebApiService', ['listFolder']);
    webApiServiceSpy.listFolder.and.returnValue(
      of(toPending<ListFolderResponse>()),
    );

    await TestBed.configureTestingModule({
      imports: [EmptyComponent],
      providers: [
        provideMockStore(),
        provideRouter([
          {
            path: 'folders/:remotePath',
            component: FolderListViewComponent,
          },
        ]),
        { provide: WebApiService, useValue: webApiServiceSpy },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    router.navigate([
      '/folders',
      Buffer.from('my-remote:my/nested/dir').toString('base64'),
    ]);
  });

  it('should display current folder correctly', () => {
    const fixture = TestBed.createComponent(EmptyComponent);
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector(
      '[data-testid="current-folder"]',
    );
    expect(h1).toBeTruthy();
    expect(h1.textContent.trim()).toBe('dir');
  });

  it('should default to LIST view option and display app-folder-list-cards', () => {
    const fixture = TestBed.createComponent(EmptyComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('app-folder-sort-dropdown'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('app-folder-list-cards'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('app-folder-list-table'),
    ).toBeFalsy();
  });

  it('should fetch listFolder from WebApiService using the remote and path from the tokens', () => {
    const fixture = TestBed.createComponent(EmptyComponent);
    fixture.detectChanges();

    expect(webApiServiceSpy.listFolder).toHaveBeenCalledWith(
      'my-remote',
      'my/nested/dir',
    );
  });
});

@Component({
  selector: 'app-empty',
  template: '<router-outlet></router-outlet>',
  standalone: true,
  imports: [RouterModule],
})
class EmptyComponent {}
