import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { authState } from '../../../../auth/store';
import { toFailure, toSuccess } from '../../../../shared/results/results';
import { GetAlbumDetailsResponse } from '../../../services/web-api/types/album';
import { WebApiService } from '../../../services/web-api/web-api.service';
import * as albumsActions from '../albums.actions';
import { AlbumsEffects } from '../albums.effects';

describe('AlbumsEffects', () => {
  let effects: AlbumsEffects;
  let webapiService: jasmine.SpyObj<WebApiService>;

  beforeEach(() => {
    const webapiServiceSpy = jasmine.createSpyObj('WebApiService', [
      'getAlbum',
    ]);
    const actions$ = of(albumsActions.loadAlbumDetails({ albumId: '123' }));

    TestBed.configureTestingModule({
      providers: [
        AlbumsEffects,
        provideMockActions(() => actions$),
        { provide: WebApiService, useValue: webapiServiceSpy },
        provideMockStore({
          selectors: [
            {
              selector: authState.selectAuthToken,
              value: 'mockAccessToken123',
            },
          ],
        }),
      ],
    });

    effects = TestBed.inject(AlbumsEffects);
    webapiService = TestBed.inject(
      WebApiService,
    ) as jasmine.SpyObj<WebApiService>;
  });

  it('should fetch album details successfully', (done) => {
    const albumDetails = {
      id: '123',
      albumName: 'Test Album',
      numChildAlbums: 0,
      numMediaItems: 0,
    };
    webapiService.getAlbum.and.returnValue(of(toSuccess(albumDetails)));

    effects.loadAlbumDetails$.subscribe((action) => {
      expect(action).toEqual(
        albumsActions.loadAlbumDetailsResult({
          albumId: '123',
          result: toSuccess(albumDetails),
        }),
      );
      done();
    });
  });

  it('should handle error when fetching album details', (done) => {
    const error = new Error('Test error');
    webapiService.getAlbum.and.returnValue(
      of(toFailure<GetAlbumDetailsResponse>(error)),
    );

    effects.loadAlbumDetails$.subscribe((action) => {
      expect(action).toEqual(
        albumsActions.loadAlbumDetailsResult({
          albumId: '123',
          result: toFailure(error),
        }),
      );
      done();
    });
  });
});
