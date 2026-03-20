import { fakeAsync, TestBed } from '@angular/core/testing';
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
  ListAlbumsResponse,
  ListAlbumsSortByFields,
  ListAlbumsSortDirection,
} from '../../../../services/web-api/types/list-albums';
import { WebApiService } from '../../../../services/web-api/web-api.service';
import { AlbumsListCardsComponent } from '../albums-list-cards.component';

const ALBUM_1: Album = {
  id: 'album1',
  albumName: 'Test Album 1',
  parentAlbumId: 'album-parent',
  numChildAlbums: 0,
  numMediaItems: 1,
};

const ALBUM_2: Album = {
  id: 'album2',
  albumName: 'Test Album 2',
  parentAlbumId: 'album-parent',
  numChildAlbums: 0,
  numMediaItems: 1,
};

const ALBUM_3: Album = {
  id: 'album3',
  albumName: 'Test Album 3',
  parentAlbumId: 'album-parent',
  numChildAlbums: 0,
  numMediaItems: 1,
};

describe('AlbumsListCardsComponent', () => {
  let mockWebApiService: jasmine.SpyObj<WebApiService>;

  beforeEach(async () => {
    mockWebApiService = jasmine.createSpyObj('WebApiService', ['listAlbums']);

    await TestBed.configureTestingModule({
      imports: [AlbumsListCardsComponent],
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

  it('should render skeleton while loading', () => {
    mockWebApiService.listAlbums.and.returnValue(
      of(toPending<ListAlbumsResponse>()),
    );
    const fixture = TestBed.createComponent(AlbumsListCardsComponent);
    fixture.componentRef.setInput('albumId', 'album123');
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.ASCENDING,
    });
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector(
      '[data-testid="album-skeleton"]',
    );
    expect(skeleton).toBeTruthy();
  });

  it('should render error when loading fails', () => {
    mockWebApiService.listAlbums.and.returnValue(
      of(toFailure<ListAlbumsResponse>(new Error('Random error'))),
    );
    const fixture = TestBed.createComponent(AlbumsListCardsComponent);
    fixture.componentRef.setInput('albumId', 'album123');
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.ASCENDING,
    });
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector(
      '[data-testid="albums-error"]',
    );
    expect(error?.textContent).toContain('Random error');
  });

  it('should render album cards when load succeeds', fakeAsync(() => {
    mockWebApiService.listAlbums.and.returnValue(
      of(
        toSuccess<ListAlbumsResponse>({
          albums: [ALBUM_1, ALBUM_2, ALBUM_3],
          nextPageToken: undefined,
        }),
      ),
    );

    const fixture = TestBed.createComponent(AlbumsListCardsComponent);
    fixture.componentRef.setInput('albumId', 'album123');
    fixture.componentRef.setInput('sortBy', {
      field: ListAlbumsSortByFields.ID,
      direction: ListAlbumsSortDirection.ASCENDING,
    });
    fixture.detectChanges();

    const albums = fixture.nativeElement.querySelectorAll(
      '[data-testid="album"]',
    );
    expect(albums.length).toBe(3);

    const names = fixture.nativeElement.querySelectorAll(
      '[data-testid="album-card-name"]',
    );
    expect(names[0].textContent).toContain('Test Album');
  }));
});
