import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { Map as ImmutableMap } from 'immutable';
import { of } from 'rxjs';

import { authState } from '../../auth/store';
import { toSuccess } from '../../shared/results/results';
import { themeState } from '../../themes/store';
import { ContentPageComponent } from '../content-page.component';
import { routes } from '../content-page.routes';
import { ChatAgentService } from '../services/chat-agent/chat-agent.service';
import { Album } from '../services/web-api/types/album';
import { ListAlbumsResponse } from '../services/web-api/types/list-albums';
import { ListMediaItemsResponse } from '../services/web-api/types/list-media-items';
import { WebApiService } from '../services/web-api/web-api.service';
import { albumsState } from '../store/albums';
import { chatsState } from '../store/chats';
import { dialogsState } from '../store/dialogs';

const ALBUM_DETAILS_ROOT: Album = {
  id: 'album1',
  albumName: '',
  numChildAlbums: 1,
  numMediaItems: 0,
};

const ALBUM_DETAILS_ARCHIVES: Album = {
  id: 'album2',
  albumName: 'Archives',
  parentAlbumId: 'album1',
  numChildAlbums: 1,
  numMediaItems: 0,
};

const ALBUM_DETAILS_PHOTOS: Album = {
  id: 'album3',
  albumName: 'Photos',
  parentAlbumId: 'album2',
  numChildAlbums: 2,
  numMediaItems: 2,
};

const ALBUM_DETAILS_2010: Album = {
  id: 'album4',
  albumName: '2010',
  parentAlbumId: 'album3',
  numChildAlbums: 0,
  numMediaItems: 0,
};

const ALBUM_DETAILS_2011: Album = {
  id: 'album5',
  albumName: '2011',
  parentAlbumId: 'album3',
  numChildAlbums: 0,
  numMediaItems: 0,
};

const PAGE_1: ListMediaItemsResponse = {
  mediaItems: [
    {
      id: 'photos1',
      fileName: 'dog.png',
      hashCode: '',
      gPhotosMediaItemId: 'gPhotosClient1:gPhotosMediaItem1',
      width: 200,
      height: 300,
      dateTaken: new Date('2024-05-27T13:17:46.000Z'),
      mimeType: 'image/png',
    },
    {
      id: 'photos2',
      fileName: 'cat.png',
      hashCode: '',
      gPhotosMediaItemId: 'gPhotosClient1:gPhotosMediaItem2',
      width: 200,
      height: 300,
      dateTaken: new Date('2024-05-27T13:17:46.000Z'),
      mimeType: 'image/png',
    },
  ],
};

describe('ContentPageComponent', () => {
  let mockWebApiService: jasmine.SpyObj<WebApiService>;
  let mockChatAgentService: jasmine.SpyObj<ChatAgentService>;
  let fixture: ComponentFixture<ContentPageComponent>;
  let router: Router;

  beforeEach(async () => {
    mockWebApiService = jasmine.createSpyObj('WebApiService', [
      'listMediaItems',
      'listAlbums',
    ]);
    mockChatAgentService = jasmine.createSpyObj('ChatAgentService', [
      'clearMemory',
      'getAgentResponseStream',
    ]);

    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideMockStore({
          initialState: {
            [albumsState.FEATURE_KEY]: {
              idToDetails: ImmutableMap()
                .set('album1', toSuccess(ALBUM_DETAILS_ROOT))
                .set('album2', toSuccess(ALBUM_DETAILS_ARCHIVES))
                .set('album3', toSuccess(ALBUM_DETAILS_PHOTOS))
                .set('album4', toSuccess(ALBUM_DETAILS_2010))
                .set('album5', toSuccess(ALBUM_DETAILS_2011)),
            },
            [dialogsState.FEATURE_KEY]: dialogsState.initialState,
            [themeState.FEATURE_KEY]: themeState.initialState,
            [authState.FEATURE_KEY]: authState.buildInitialState(),
            [chatsState.FEATURE_KEY]: chatsState.initialState,
          },
        }),
        { provide: WebApiService, useValue: mockWebApiService },
        { provide: ChatAgentService, useValue: mockChatAgentService },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentPageComponent);
    fixture.detectChanges();

    router = TestBed.inject(Router);

    mockWebApiService.listMediaItems.and.returnValue(of(toSuccess(PAGE_1)));
    mockWebApiService.listAlbums.and.returnValue(
      of(
        toSuccess<ListAlbumsResponse>({
          albums: [ALBUM_DETAILS_2010, ALBUM_DETAILS_2011],
        }),
      ),
    );
  });

  it('should show albums and photos given current route is in /albums/:albumId', () => {
    router.navigateByUrl('/albums/123');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('app-albums-view'),
    ).toBeTruthy();
  });

  it('should show photos given current route is in /photos', () => {
    router.navigateByUrl('/photos');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('app-photos-view'),
    ).toBeTruthy();
  });
});
