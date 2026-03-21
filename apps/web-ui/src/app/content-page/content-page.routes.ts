import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';

import { ContentPageComponent } from './content-page.component';
import { RemotesViewComponent } from './remotes-view/remotes-view.component';
import { dialogFeature } from './store/dialogs/dialogs.reducer';

export const routes: Routes = [
  {
    path: '',
    component: ContentPageComponent,
    children: [
      { path: 'remotes', component: RemotesViewComponent },
    ],
    providers: [
      provideState(dialogFeature),
    ],
  },
];
