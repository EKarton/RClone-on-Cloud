import { Routes } from '@angular/router';
import { HomePageComponent } from './home-page/home-page.component';
import { CallbackPageComponent } from './auth/callback-page/callback-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent, pathMatch: 'full' },
  { path: 'auth/v1/google/callback', component: CallbackPageComponent },
  { path: 'contents', loadChildren: () => import('./content-page/content-page.routes').then(m => m.routes) },
  { path: '**', redirectTo: '' }
];
