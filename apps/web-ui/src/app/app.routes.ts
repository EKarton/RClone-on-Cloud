import { Routes } from '@angular/router';

import { CallbackPageComponent } from './auth/callback-page/callback-page.component';
import { HomePageComponent } from './home-page/home-page.component';
import { NotFoundPageComponent } from './not-found-page/not-found-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent, pathMatch: 'full' },
  {
    path: 'auth/v1/google/callback',
    component: CallbackPageComponent,
    pathMatch: 'prefix',
  },
  {
    path: '',
    loadChildren: () =>
      import('./content-page/content-page.routes').then((m) => m.routes),
  },
  { path: '404', component: NotFoundPageComponent },
  { path: '**', redirectTo: '404' },
];
