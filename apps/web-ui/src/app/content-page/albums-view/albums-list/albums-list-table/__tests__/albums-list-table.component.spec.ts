import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../../auth/store';
import {
  toFailure,
  toPending,
  toSuccess,
} from '../../../../../shared/results/results';
import { Album } from '../../../../services/web-api/types/album';
import {
  ListAlbumsRequest,
  ListAlbumsResponse,
  ListAlbumsSortByFields,
  ListAlbumsSortDirection,
} from '../../../../services/web-api/types/list-albums';
import { WebApiService } from '../../../../services/web-api/web-api.service';
import { AlbumsListTableComponent } from '../albums-list-table.component';

const ALBUM_DETAILS: Album = {
  id: 'album1',
  albumName: '2010',
  parentAlbumId: 'album1',
  numChildAlbums: 0,
  numMediaItems: 1,
};

describe('AlbumsListTableComponent', () => {
  let mockWebApiService: jasmine.SpyObj<WebApiService>;

  beforeEach(async () => {
    mockWebApiService = jasmine.createSpyObj('WebApiService', ['listAlbums']);

    await TestBed.configureTestingModule({
      imports: [AlbumsListTableComponent],
      providers: [
        provideRouter([]),
        provideMockStore({
          selectors: [
            {
              selector: authState.selectAuthToken,
              value: 'auth123',
            },
          ],
        }),
        { provide: WebApiService, useValue: mockWebApiService },
      ],
    }).compileComponents();
  });

  it('should render skeleton when albums are not loaded yet', () => {
    mockWebApiService.listAlbums.and.returnValue(
      of(toPending<ListAlbumsResponse>()),
    );
    const fixture = TestBed.createComponent(AlbumsListTableComponent);
    fixture.componentRef.setInput('albumId', 'album123');
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.ASCENDING,
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll(
        '[data-testid="table-row-skeleton"]',
      ).length,
    ).toEqual(5);
  });

  it('should show error when albums has failed to load', () => {
    mockWebApiService.listAlbums.and.returnValue(
      of(toFailure<ListAlbumsResponse>(new Error('Random error'))),
    );
    const fixture = TestBed.createComponent(AlbumsListTableComponent);
    fixture.componentRef.setInput('albumId', 'album123');
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.ASCENDING,
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="table-row-error"]'),
    ).toBeTruthy();
  });

  it('should render correctly when initial page loaded', () => {
    mockWebApiService.listAlbums.and.returnValue(
      of(
        toSuccess<ListAlbumsResponse>({
          albums: [
            ALBUM_DETAILS,
            ALBUM_DETAILS,
            ALBUM_DETAILS,
            ALBUM_DETAILS,
            ALBUM_DETAILS,
          ],
          nextPageToken: undefined,
        }),
      ),
    );
    const fixture = TestBed.createComponent(AlbumsListTableComponent);
    fixture.componentRef.setInput('albumId', 'album123');
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.ASCENDING,
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="table-row-album"]')
        .length,
    ).toEqual(5);
  });

  it('should paginate correctly when initial page loaded with next pages available', () => {
    mockWebApiService.listAlbums.and.callFake(
      (_, request: ListAlbumsRequest) => {
        if (!request.pageToken) {
          return of(
            toSuccess<ListAlbumsResponse>({
              albums: Array.from(
                { length: request.pageSize || 5 },
                (_, i): Album => ({
                  ...ALBUM_DETAILS,
                  id: `${i}.1`,
                }),
              ),
              nextPageToken: 'page2',
            }),
          );
        } else if (request.pageToken === 'page2') {
          return of(
            toSuccess<ListAlbumsResponse>({
              albums: Array.from(
                { length: request.pageSize || 5 },
                (_, i): Album => ({
                  ...ALBUM_DETAILS,
                  id: `${i}.2`,
                }),
              ),
              nextPageToken: 'page3',
            }),
          );
        } else {
          return of(
            toSuccess<ListAlbumsResponse>({
              albums: [],
              nextPageToken: undefined,
            }),
          );
        }
      },
    );
    const fixture = TestBed.createComponent(AlbumsListTableComponent);
    fixture.componentRef.setInput('albumId', 'album123');
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.ASCENDING,
    });
    fixture.detectChanges();

    // Go to next page
    const nextPageButton = fixture.nativeElement.querySelector(
      '[data-testid="go-to-next-page-button"]',
    );
    nextPageButton.click();

    // Verify api calls
    expect(mockWebApiService.listAlbums).toHaveBeenCalledWith('auth123', {
      parentAlbumId: 'album123',
      pageToken: 'page2',
      pageSize: 5,
      sortBy: {
        field: ListAlbumsSortByFields.ID,
        direction: ListAlbumsSortDirection.ASCENDING,
      },
    });
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="table-row-album"]')
        .length,
    ).toEqual(5);

    // Go to next page
    nextPageButton.click();

    // Verify api calls
    expect(mockWebApiService.listAlbums).toHaveBeenCalledWith('auth123', {
      parentAlbumId: 'album123',
      pageToken: 'page3',
      pageSize: 5,
      sortBy: {
        field: ListAlbumsSortByFields.ID,
        direction: ListAlbumsSortDirection.ASCENDING,
      },
    });
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="table-row-album"]')
        .length,
    ).toEqual(5);

    // Go to previous page
    const previousPageButton = fixture.nativeElement.querySelector(
      '[data-testid="go-to-previous-page-button"]',
    );
    previousPageButton.click();

    // Verify api calls
    expect(mockWebApiService.listAlbums).toHaveBeenCalledWith('auth123', {
      parentAlbumId: 'album123',
      pageToken: 'page2',
      pageSize: 5,
      sortBy: {
        field: ListAlbumsSortByFields.ID,
        direction: ListAlbumsSortDirection.ASCENDING,
      },
    });
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="table-row-album"]')
        .length,
    ).toEqual(5);

    // Go to first page
    const goToFirstPageButton = fixture.nativeElement.querySelector(
      '[data-testid="go-to-first-page-button"]',
    );
    goToFirstPageButton.click();

    expect(mockWebApiService.listAlbums).toHaveBeenCalledWith('auth123', {
      parentAlbumId: 'album123',
      pageSize: 5,
      sortBy: {
        field: ListAlbumsSortByFields.ID,
        direction: ListAlbumsSortDirection.ASCENDING,
      },
    });
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="table-row-album"]')
        .length,
    ).toEqual(5);
  });

  it('should make api call correctly when page size changes', () => {
    mockWebApiService.listAlbums.and.callFake(
      (_, request: ListAlbumsRequest) => {
        return of(
          toSuccess<ListAlbumsResponse>({
            albums: Array.from(
              { length: request.pageSize || 5 },
              (_, i): Album => ({
                ...ALBUM_DETAILS,
                id: `${i}.1`,
              }),
            ),
          }),
        );
      },
    );
    const fixture = TestBed.createComponent(AlbumsListTableComponent);
    fixture.componentRef.setInput('albumId', 'album123');
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.ASCENDING,
    });
    fixture.detectChanges();

    // Change the page size to 10
    const select: HTMLSelectElement =
      fixture.nativeElement.querySelector('select');
    select.value = '10';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    // Verify API called with updated page size
    expect(mockWebApiService.listAlbums).toHaveBeenCalledWith('auth123', {
      parentAlbumId: 'album123',
      pageSize: 5,
      sortBy: {
        field: ListAlbumsSortByFields.ID,
        direction: ListAlbumsSortDirection.ASCENDING,
      },
    });
    expect(mockWebApiService.listAlbums).toHaveBeenCalledWith('auth123', {
      parentAlbumId: 'album123',
      pageSize: 10,
      sortBy: {
        field: ListAlbumsSortByFields.ID,
        direction: ListAlbumsSortDirection.ASCENDING,
      },
    });
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="table-row-album"]')
        .length,
    ).toBe(10);
  });
});
