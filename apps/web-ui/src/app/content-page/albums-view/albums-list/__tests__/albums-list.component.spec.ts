import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../auth/store';
import { toSuccess } from '../../../../shared/results/results';
import { Album } from '../../../services/web-api/types/album';
import { ListAlbumsResponse } from '../../../services/web-api/types/list-albums';
import { WebApiService } from '../../../services/web-api/web-api.service';
import { AlbumsListComponent } from '../albums-list.component';

const ALBUM_API_RESPONSE_2010: Album = {
  id: 'album4',
  albumName: '2010',
  parentAlbumId: 'album3',
  numChildAlbums: 0,
  numMediaItems: 0,
};

const ALBUM_API_RESPONSE_2011: Album = {
  id: 'album5',
  albumName: '2011',
  parentAlbumId: 'album3',
  numChildAlbums: 0,
  numMediaItems: 0,
};

describe('AlbumsListComponent', () => {
  let mockWebApiService: jasmine.SpyObj<WebApiService>;

  beforeEach(async () => {
    mockWebApiService = jasmine.createSpyObj('WebApiService', ['listAlbums']);

    await TestBed.configureTestingModule({
      imports: [AlbumsListComponent],
      providers: [
        provideMockStore({
          selectors: [
            { selector: authState.selectAuthToken, value: 'mockAccessToken' },
          ],
        }),
        provideRouter([]),
        { provide: WebApiService, useValue: mockWebApiService },
      ],
    }).compileComponents();
  });

  it('should render albums in cards view when successful', () => {
    mockWebApiService.listAlbums.and.returnValue(
      of(
        toSuccess<ListAlbumsResponse>({
          albums: [ALBUM_API_RESPONSE_2010, ALBUM_API_RESPONSE_2011],
          nextPageToken: undefined,
        }),
      ),
    );

    const fixture = TestBed.createComponent(AlbumsListComponent);
    fixture.componentRef.setInput('albumId', 'album3');
    fixture.detectChanges();

    const albums = fixture.nativeElement.querySelectorAll(
      '[data-testid="album"]',
    );
    expect(albums.length).toBe(2);

    const names = fixture.nativeElement.querySelectorAll(
      '[data-testid="album-card-name"]',
    );
    expect(names[0].textContent).toContain('2010');
    expect(names[1].textContent).toContain('2011');
  });

  it('should switch to table view when checkbox is clicked', () => {
    mockWebApiService.listAlbums.and.returnValue(
      of(
        toSuccess<ListAlbumsResponse>({
          albums: [ALBUM_API_RESPONSE_2010, ALBUM_API_RESPONSE_2011],
          nextPageToken: undefined,
        }),
      ),
    );

    const fixture = TestBed.createComponent(AlbumsListComponent);
    fixture.componentRef.setInput('albumId', 'album3');
    fixture.detectChanges();

    // Click on the dropdown to switch to table view
    fixture.nativeElement
      .querySelector('app-content-albums-list-view-dropdown')
      .click();
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('[data-testid="table-view-radio-button"]')
      .click();
    fixture.detectChanges();

    const tableRows = fixture.nativeElement.querySelectorAll(
      '[data-testid="table-row-album"]',
    );
    expect(tableRows.length).toBe(2);
    expect(tableRows[0].textContent).toContain('2010');
    expect(tableRows[1].textContent).toContain('2011');
  });
});
