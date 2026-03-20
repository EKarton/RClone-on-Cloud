import { toSuccess } from '../../../../shared/results/results';
import { GetAlbumDetailsResponse } from '../../../services/web-api/types/album';
import * as fromActions from '../albums.actions';

describe('Album Actions', () => {
  it('should create a loadAlbumDetails action', () => {
    const albumId = '123';
    const action = fromActions.loadAlbumDetails({ albumId });

    expect(action.type).toBe('[Albums] Load details of an album by ID');
    expect(action.albumId).toBe(albumId);
  });

  it('should create a loadAlbumDetailsResult action', () => {
    const albumId = '123';
    const result = toSuccess<GetAlbumDetailsResponse>({
      id: albumId,
      albumName: 'Test Album',
      parentAlbumId: undefined,
      numChildAlbums: 0,
      numMediaItems: 0,
    });
    const action = fromActions.loadAlbumDetailsResult({ albumId, result });

    expect(action.type).toBe(
      '[Albums] Saves results of getting details of an album',
    );
    expect(action.albumId).toBe(albumId);
    expect(action.result).toEqual(result);
  });
});
