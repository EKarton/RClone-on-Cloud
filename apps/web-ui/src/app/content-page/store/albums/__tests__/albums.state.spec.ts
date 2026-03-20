import { Map as ImmutableMap } from 'immutable';

import {
  Result,
  toPending,
  toSuccess,
} from '../../../../shared/results/results';
import { GetAlbumDetailsResponse } from '../../../services/web-api/types/album';
import { Album } from '../../../services/web-api/types/album';
import {
  AlbumsState,
  buildInitialState,
  selectAlbumDetailsById,
} from '../albums.state';

describe('Albums State', () => {
  it('should have the correct initial state', () => {
    expect(buildInitialState()).toEqual({
      idToDetails: ImmutableMap(),
    });
  });

  describe('selectAlbumDetailsById', () => {
    it('should return pending result when album is not in state', () => {
      const state: AlbumsState = {
        idToDetails: ImmutableMap(),
      };

      const result = selectAlbumDetailsById('123')({ Albums: state });

      expect(result).toEqual(toPending());
    });

    it('should return album details when present in state', () => {
      const albumDetailsResult = toSuccess<GetAlbumDetailsResponse>({
        id: '123',
        albumName: 'Test Album',
        numChildAlbums: 0,
        numMediaItems: 0,
      });
      const state: AlbumsState = {
        idToDetails: ImmutableMap<string, Result<Album>>().set(
          '123',
          albumDetailsResult,
        ),
      };

      const result = selectAlbumDetailsById('123')({ Albums: state });

      expect(result).toEqual(albumDetailsResult);
    });
  });
});
