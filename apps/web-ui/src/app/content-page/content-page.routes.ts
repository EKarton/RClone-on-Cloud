import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { AlbumsViewComponent } from './albums-view/albums-view.component';
import { ContentPageComponent } from './content-page.component';
import { ImagesViewComponent } from './images-view/images-view.component';
import { AlbumsEffects } from './store/albums/albums.effects';
import { albumsFeature } from './store/albums/albums.reducer';
import { ChatsEffects } from './store/chats/chats.effects';
import { chatsFeature } from './store/chats/chats.reducer';
import { dialogFeature } from './store/dialogs/dialogs.reducer';

export const routes: Routes = [
  {
    path: '',
    component: ContentPageComponent,
    children: [
      { path: 'albums/:albumId', component: AlbumsViewComponent },
      { path: 'photos', component: ImagesViewComponent },
    ],
    providers: [
      provideState(albumsFeature),
      provideState(dialogFeature),
      provideState(chatsFeature),
      provideEffects(AlbumsEffects),
      provideEffects(ChatsEffects),
    ],
  },
];
