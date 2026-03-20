import { createAction, props } from '@ngrx/store';

import { Result } from '../../../shared/results/results';
import {
  Album,
  GetAlbumDetailsResponse,
} from '../../services/web-api/types/album';

/** An action that fetches the details of an album. */
export const loadAlbumDetails = createAction(
  '[Albums] Load details of an album by ID',
  props<{ albumId: string }>(),
);

/** An action that saves the results of fetching a list of GPhotos clients */
export const loadAlbumDetailsResult = createAction(
  '[Albums] Saves results of getting details of an album',
  props<{ albumId: string; result: Result<GetAlbumDetailsResponse> }>(),
);

/** An action that adds an album to the store */
export const addAlbum = createAction(
  '[Albums] Adds an album to the store',
  props<{ album: Album }>(),
);
