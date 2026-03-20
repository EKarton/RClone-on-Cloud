import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Map as ImmutableMap } from 'immutable';

import { authState } from '../../../../auth/store';
import { toPending, toSuccess } from '../../../../shared/results/results';
import { Album } from '../../../services/web-api/types/album';
import { albumsActions, albumsState } from '../../../store/albums';
import { BreadcrumbsComponent } from '../breadcrumbs.component';

const ALBUM_API_RESPONSE_ROOT: Album = {
  id: 'album1',
  albumName: '',
  numChildAlbums: 1,
  numMediaItems: 0,
};

const ALBUM_API_RESPONSE_ARCHIVES: Album = {
  id: 'album2',
  albumName: 'Archives',
  parentAlbumId: 'album1',
  numChildAlbums: 1,
  numMediaItems: 0,
};

const ALBUM_API_RESPONSE_PHOTOS: Album = {
  id: 'album3',
  albumName: 'Photos',
  parentAlbumId: 'album2',
  numChildAlbums: 0,
  numMediaItems: 0,
};

describe('BreadcrumbsComponent', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbsComponent],
      providers: [
        provideMockStore({
          initialState: {
            [albumsState.FEATURE_KEY]: albumsState.buildInitialState(),
          },
          selectors: [
            { selector: authState.selectAuthToken, value: 'mockAccessToken' },
          ],
        }),
        provideRouter([]),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
  });

  it('should render component when data is already present', () => {
    store.setState({
      [albumsState.FEATURE_KEY]: {
        idToDetails: ImmutableMap()
          .set('album3', toSuccess(ALBUM_API_RESPONSE_PHOTOS))
          .set('album2', toSuccess(ALBUM_API_RESPONSE_ARCHIVES))
          .set('album1', toSuccess(ALBUM_API_RESPONSE_ROOT)),
      },
    });
    store.refreshState();

    const fixture = TestBed.createComponent(BreadcrumbsComponent);
    fixture.componentRef.setInput('albumId', 'album3');
    fixture.detectChanges();

    // Assert component renders
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();

    // Assert component has the right text
    const links: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('a'),
    );
    expect(links.length).toEqual(3);
    expect(links[0].textContent).toEqual('Home');
    expect(links[1].textContent).toEqual('Archives');
    expect(links[2].textContent).toEqual('Photos');
  });

  it('should render spinner when data is not loaded yet', () => {
    const fixture = TestBed.createComponent(BreadcrumbsComponent);
    fixture.componentRef.setInput('albumId', 'album3');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.skeleton')).toBeTruthy();
  });

  it('should dispatch events correctly when data is not loaded yet', () => {
    spyOn(store, 'dispatch');
    store.setState({
      [albumsState.FEATURE_KEY]: {
        idToDetails: ImmutableMap()
          .set('album3', toSuccess(ALBUM_API_RESPONSE_PHOTOS))
          .set('album2', toSuccess(ALBUM_API_RESPONSE_ARCHIVES))
          .set('album1', toPending()),
      },
    });
    store.refreshState();

    const fixture = TestBed.createComponent(BreadcrumbsComponent);
    fixture.componentRef.setInput('albumId', 'album3');
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(
      albumsActions.loadAlbumDetails({ albumId: 'album1' }),
    );
    expect(fixture.nativeElement.querySelector('.skeleton')).toBeTruthy();
  });
});
