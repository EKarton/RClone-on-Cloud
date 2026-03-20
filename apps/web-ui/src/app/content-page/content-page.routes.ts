import { Routes } from '@angular/router';
import { ContentsPageComponent } from './contents-page.component';
import { DirectoryDetailsComponent } from './directory-details/directory-details.component';

export const routes: Routes = [
  { path: '', component: ContentsPageComponent },
  { path: ':id', component: DirectoryDetailsComponent },
];
