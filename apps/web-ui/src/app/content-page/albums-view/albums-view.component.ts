import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, Observable, Subscription, switchMap } from 'rxjs';

import { HasFailedPipe } from '../../shared/results/pipes/has-failed.pipe';
import { IsPendingPipe } from '../../shared/results/pipes/is-pending.pipe';
import { Result } from '../../shared/results/results';
import { ImagesViewComponent } from '../images-view/images-view.component';
import { Album } from '../services/web-api/types/album';
import { albumsActions, albumsState } from '../store/albums';
import { AlbumsListComponent } from './albums-list/albums-list.component';
import { BreadcrumbsComponent } from './breadcrumbs/breadcrumbs.component';

@Component({
  standalone: true,
  selector: 'app-albums-view',
  imports: [
    CommonModule,
    IsPendingPipe,
    HasFailedPipe,
    AlbumsListComponent,
    ImagesViewComponent,
    BreadcrumbsComponent,
  ],
  templateUrl: './albums-view.component.html',
})
export class AlbumsViewComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly subscription = new Subscription();

  readonly albumId$ = this.route.paramMap.pipe(
    map((params) => params.get('albumId')!),
  );

  readonly albumResult$: Observable<Result<Album>> = this.albumId$.pipe(
    switchMap((albumId) =>
      this.store.select(albumsState.selectAlbumDetailsById(albumId)),
    ),
  );

  ngOnInit() {
    this.subscription.add(
      this.albumId$.subscribe((albumId) => {
        this.store.dispatch(albumsActions.loadAlbumDetails({ albumId }));
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
