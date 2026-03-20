import { createFeature, createReducer, on } from '@ngrx/store';

import { toSuccess } from '../../../shared/results/results';
import * as albumsActions from './albums.actions';
import { buildInitialState, FEATURE_KEY } from './albums.state';

/** The albums reducer */
export const albumsReducer = createReducer(
  buildInitialState(),

  on(albumsActions.loadAlbumDetailsResult, (state, { albumId, result }) => {
    return {
      ...state,
      idToDetails: state.idToDetails.set(albumId, result),
    };
  }),

  on(albumsActions.addAlbum, (state, { album }) => {
    return {
      ...state,
      idToDetails: state.idToDetails.set(album.id, toSuccess(album)),
    };
  }),
);

export const albumsFeature = createFeature({
  name: FEATURE_KEY,
  reducer: albumsReducer,
});
