import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Buffer } from 'buffer';
import { map, Observable, Subscription } from 'rxjs';

import { REMOTE_PATH$ } from '../folder-list-view.tokens';

export interface BreadcrumbItem {
  id: string;
  text: string;
  routerLink: string | undefined;
}

@Component({
  selector: 'app-folder-breadcrumbs',
  imports: [CommonModule, RouterModule],
  templateUrl: './folder-breadcrumbs.component.html',
})
export class FolderBreadcrumbsComponent implements OnInit, OnDestroy {
  readonly remotePath$ = inject(REMOTE_PATH$);

  @ViewChild('breadcrumbContainer')
  breadcrumbContainer?: ElementRef<HTMLDivElement>;

  private readonly subscriptions = new Subscription();

  readonly breadcrumbItems$: Observable<BreadcrumbItem[]> = this.remotePath$.pipe(
    map((remotePath) => {
      const breadcrumbs: BreadcrumbItem[] = [
        {
          id: 'home',
          text: 'Home',
          routerLink: '/remotes',
        },
      ];

      const folders = remotePath.path?.split('/') ?? [];

      breadcrumbs.push({
        id: remotePath.remote,
        text: remotePath.remote,
        routerLink:
          folders.length > 0
            ? `/folders/${Buffer.from(`${remotePath.remote}:`).toString('base64').replace(/=/g, '')}`
            : undefined,
      });

      const pastFolderNames = folders.slice(0, folders.length - 1);
      const curFolderName = folders[folders.length - 1];
      let prevPath: string | null = null;

      for (const folder of pastFolderNames) {
        const curLink: string = prevPath ? `${prevPath}/${folder}` : folder;

        breadcrumbs.push({
          id: `${remotePath.remote}:${curLink}`,
          text: folder,
          routerLink: `/folders/${Buffer.from(`${remotePath.remote}:${curLink}`).toString('base64').replace(/=/g, '')}`,
        });
        prevPath = curLink;
      }

      if (curFolderName) {
        breadcrumbs.push({
          id: `${remotePath.remote}:${prevPath}/${curFolderName}`,
          text: curFolderName,
          routerLink: undefined,
        });
      }

      return breadcrumbs;
    }),
  );

  ngOnInit(): void {
    this.subscriptions.add(
      this.breadcrumbItems$.subscribe(() => {
        setTimeout(() => {
          const el = this.breadcrumbContainer?.nativeElement;
          if (el) {
            el.scrollLeft = el.scrollWidth;
          }
        }, 0);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
