import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';

import { ContentPageComponent } from './content-page.component';
import { FolderListViewComponent } from './folder-list-view/folder-list-view.component';
import { RemotesViewComponent } from './remotes-view/remotes-view.component';
import { dialogFeature } from './store/dialogs/dialogs.reducer';
import { fileUploadsFeature } from './store/file-uploads/file-uploads.reducer';
import { provideEffects } from '@ngrx/effects';
import { FileUploadsEffects } from './store/file-uploads/file-uploads.effects';

export const routes: Routes = [
  {
    path: '',
    component: ContentPageComponent,
    children: [
      { path: 'remotes', component: RemotesViewComponent },
      { path: 'folders/:remotePath', component: FolderListViewComponent },
    ],
    providers: [
      provideState(dialogFeature),
      provideState(fileUploadsFeature),
      provideEffects(FileUploadsEffects),
    ],
  },
];
