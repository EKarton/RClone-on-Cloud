import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Map as ImmutableMap } from 'immutable';

import { Result, toPending } from '../../../shared/results/results';
import { Album } from '../../services/web-api/types/album';

/** The type defs of this NgRx store. */
export interface AlbumsState {
  idToDetails: ImmutableMap<string, Result<Album>>;
}

/** Used to build the initial state of the NgRx store. */
export const buildInitialState: () => AlbumsState = () => ({
  idToDetails: ImmutableMap(),
});

/** The feature key shared with the reducer. */
export const FEATURE_KEY = 'Albums';

/** Returns the entire state of the albums store */
export const selectAlbumsState =
  createFeatureSelector<AlbumsState>(FEATURE_KEY);

/** Returns the album details. */
export const selectAlbumDetailsById = (id: string) =>
  createSelector(selectAlbumsState, (state) =>
    state.idToDetails.get(id, toPending<Album>()),
  );
